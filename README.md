# ExoMind Exoplanet Predictor

## Overview
This repository hosts a lightweight prototype that trains a Random Forest model on Kepler Object of Interest (KOI) data and exposes it through a FastAPI service behind an Express/static front end. The stack is split into a Python inference microservice and a Node.js wrapper that serves the UI and forwards prediction calls.

## Architecture
- **Dataset and model training (`data/`, `model.py`)**
  - `data/koi.csv` is the default training dataset. `model.py` handles data cleansing, feature selection, training, and simple evaluation helpers.
  - At import time no model is trained; instead, `train_in_memory` loads the CSV, filters valid labels, imputes missing data, and fits a `RandomForestClassifier`.
- **Python inference API (`server.py`)**
  - FastAPI app that trains the model during the startup event and keeps it in memory.
  - Exposes `GET /predict` (JSON) and `GET /predict_raw` (plain text) endpoints along with `GET /health` for readiness checks.
  - Respects the `KOI_DATA_PATH` env var to point at alternate CSV files.
- **JavaScript proxy and static server (`server.js`)**
  - Express server that serves the static UI from `public/` (or a `dist/` build if present).
  - Proxies `GET /api/predict` to the Python API, adding a timeout (configurable via `PYTHON_API_TIMEOUT`) and translating errors back to the browser.
- **Frontend assets (`public/`, optional `dist/`)**
  - Static site that collects KOI feature inputs and calls the Express proxy. Assets can be swapped for a Vite build placed under `dist/`.
- **Support files**
  - `test-api.js` is a helper script for checking the inference backend.

## Prerequisites
- Python 3.10+ with `pip`
- Node.js 18+ and npm
- (Optional) A Python virtual environment tool such as `venv`

## Local Setup
1. Install Node dependencies:
   ```bash
   npm install
   ```
2. (Recommended) Create and activate a virtual environment, then install Python dependencies:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate    # Windows PowerShell
   source .venv/bin/activate   # macOS/Linux
   pip install -r requirements.txt
   ```

## Running Locally
1. **Start the Python API** (in its own terminal):
   ```powershell
   # Optional: point to a different dataset
   # $env:KOI_DATA_PATH = "C:\path\to\custom_koi.csv"
   npm run py        # runs python server.py
   ```
   This step trains the Random Forest in memory using the configured CSV and exposes it on `http://127.0.0.1:8000`.

2. **Start the Express/static server** (second terminal):
   ```powershell
   # Optional: tell the proxy where to reach the Python service
   # $env:PYTHON_API_URL = "http://127.0.0.1:8000"
   # $env:PYTHON_API_TIMEOUT = "7000"  # ms
   npm run js        # runs node server.js
   ```
   Visit `http://localhost:3000` to load the UI. Requests to `/api/predict` are forwarded to the Python API.

3. **Optional API smoke test** (after servers are running):
   ```powershell
   node test-api.js
   ```
   Adjust the script payload to send custom feature sets.

## Working with the Dataset
- The project expects KOI data with columns listed in `model.py` (`ALL_FEATURES`) plus the `koi_disposition` label. The default file lives at `data/koi.csv`.
- Replacing `data/koi.csv` with a larger CSV (or pointing `KOI_DATA_PATH` to it) will increase the training corpus. Every time `server.py` starts, it retrains the in-memory Random Forest using whichever CSV is referenced, so larger datasets will be incorporated automatically.
- Ensure new datasets keep column names consistent and include both `CONFIRMED` and `FALSE POSITIVE` rows to preserve model training balance.

## Useful Environment Variables
- `KOI_DATA_PATH`: Absolute or relative path to the CSV used for training.
- `HOST` / `PORT`: Override FastAPI host/port (defaults `0.0.0.0:8000`).
- `PYTHON_API_URL`: URL that `server.js` targets for predictions (default `http://127.0.0.1:8000`).
- `PYTHON_API_TIMEOUT`: Timeout (ms) for proxying prediction requests.
- `PORT`: (Express) overrides default `3000` when serving the frontend.

With both services running, the UI lets you supply KOI features, calls the Express proxy, and receives probabilities of a planet candidate being confirmed.
