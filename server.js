import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const app = express();
const port = process.env.PORT ?? 3000;

const pythonApiBaseUrl = process.env.PYTHON_API_URL ?? 'http://127.0.0.1:8000';
const parsedTimeout = Number.parseInt(process.env.PYTHON_API_TIMEOUT ?? '', 10);
const pythonApiTimeoutMs = Number.isNaN(parsedTimeout) ? 5000 : parsedTimeout;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');
const staticRoot = fs.existsSync(path.join(distPath, 'index.html')) ? distPath : publicPath;

function forwardQueryParameters(url, query) {
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
      continue;
    }
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  }
}

app.get('/api/predict', async (req, res) => {
  const pythonUrl = new URL('/predict', pythonApiBaseUrl);
  forwardQueryParameters(pythonUrl, req.query);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), pythonApiTimeoutMs);

  try {
    const response = await fetch(pythonUrl, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      let details;
      try {
        details = contentType.includes('application/json') ? await response.json() : await response.text();
      } catch {
        details = null;
      }
      res.status(response.status).json({
        error: 'Prediction service returned an error',
        details,
      });
      return;
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
      return;
    }

    const body = await response.text();
    res.type(response.headers.get('content-type') ?? 'text/plain').send(body);
  } catch (error) {
    if (error.name === 'AbortError') {
      res.status(504).json({ error: 'Prediction service timed out' });
      return;
    }
    console.error('Prediction proxy failed', error);
    res.status(502).json({ error: 'Unable to reach prediction service' });
  } finally {
    clearTimeout(timeoutId);
  }
});

app.use(express.static(staticRoot));

app.get('*', (req, res, next) => {
  const indexFile = path.join(staticRoot, 'index.html');

  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
    return;
  }

  next();
});

app.listen(port, () => {
  console.log('Server listening on http://localhost:' + port);
});
