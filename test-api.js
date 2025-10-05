// test_api.js — versión que envía koi_depth en PPM
const BASE_URL = process.argv[2] ?? 'http://localhost:8000';

const confirmedPPM = {
  koi_period: 9.48803557,
  koi_impact: 0.146,
  koi_duration: 2.9575,
  koi_depth: 615.8,     // ppm  (= 6.1580e+02)
  koi_prad: 2.26,       // R_earth
  koi_teq: 793.0,       // K
  koi_insol: 93.59,     // S_earth
  koi_model_snr: 35.80,
  koi_steff: 5455.0,    // K
  koi_slogg: 4.467,     // log g (cgs)
  koi_srad: 0.927,      // R_sun
  koi_kepmag: 15.347    // Kepler magnitude
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
