const BASE_URL = process.argv[2] ?? 'http://localhost:8000';

async function main() {
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    console.log(healthResponse)
    if (!healthResponse.ok) {
      throw new Error(`Health check failed with ${healthResponse.status}`);
    }

    const healthData = await healthResponse.json();
    console.log('Health response:', healthData);

    const features = Array.isArray(healthData.features) ? healthData.features : [];
    if (features.length === 0) {
      console.log('The server reported no features; skipping predict test.');
      return;
    }

    const params = new URLSearchParams();
    for (const feature of features) {
      params.append(feature, '0');
    }

    const predictResponse = await fetch(`${BASE_URL}/predict?${params.toString()}`);
    if (!predictResponse.ok) {
      throw new Error(`Predict failed with ${predictResponse.status}`);
    }

    const predictData = await predictResponse.json();
    console.log('Predict response:', predictData);
  } catch (error) {
    console.error('Request error:', error.message);
    process.exitCode = 1;
  }
}

main();