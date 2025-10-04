// test_api.js — versión que envía koi_depth en PPM
const BASE_URL = process.argv[2] ?? 'http://localhost:8000';

const confirmedPPM = {
  // mismos valores que antes, pero koi_depth en ppm
  koi_period: 141.2417,
  koi_impact: 0.39,
  koi_duration: 9.93,
  koi_depth: 9800.0,   // <-- PPM
  koi_prad: 11.1,
  koi_teq: 320.0,
  koi_insol: 0.35,
  koi_model_snr: 18.7,
  koi_steff: 5630.0,
  koi_slogg: 4.41,
  koi_srad: 0.93,
  koi_kepmag: 13.7
};

const falsePositivePPM = {
  koi_period: 3.6124,
  koi_impact: 0.94,
  koi_duration: 1.95,
  koi_depth: 120.0,    // <-- PPM
  koi_prad: 1.3,
  koi_teq: 1160.0,
  koi_insol: 620.0,
  koi_model_snr: 7.9,
  koi_steff: 6020.0,
  koi_slogg: 4.24,
  koi_srad: 1.21,
  koi_kepmag: 14.8
};

async function testCase(name, features) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(features)) {
    params.append(key, String(value));
  }

  console.log(`\n=== Testing ${name} (koi_depth en PPM) ===`);
  const response = await fetch(`${BASE_URL}/predict?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Predict failed for ${name} with ${response.status}`);
  }
  const data = await response.json();
  console.log(`${name} prediction:`, data);
}

async function main() {
  try {
    console.log(`Connecting to ${BASE_URL}...`);

    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (!healthResponse.ok) throw new Error(`Health check failed with ${healthResponse.status}`);
    const healthData = await healthResponse.json();
    console.log('Health response:', healthData);

    // Ejecuta los dos tests con koi_depth en PPM
    await testCase("Confirmed exoplanet", confirmedPPM);
    await testCase("False positive", falsePositivePPM);

  } catch (error) {
    console.error('Request error:', error.message);
    process.exitCode = 1;
  }
}

main();
