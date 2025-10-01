import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const app = express();
const port = process.env.PORT ?? 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');
const staticRoot = fs.existsSync(path.join(distPath, 'index.html')) ? distPath : publicPath;

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
