# server.py
# -*- coding: utf-8 -*-

from typing import Dict
import os

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

# Importa tu script simple
# Debe contener: train_in_memory, predict_from_params, ALL_FEATURES, FEATURES_IN_USE, DATA_PATH
import model as koi_model

app = FastAPI(title="KOI RF Probabilities", version="1.0.0")

# CORS opcional (ajusta orígenes si lo necesitas)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

def _parse_params(qs: Dict[str, str]) -> Dict[str, float]:
    """Convierte los query params a dict de floats (o NaN)."""
    out: Dict[str, float] = {}
    for k, v in qs.items():
        if k in koi_model.FEATURES_IN_USE or k in koi_model.ALL_FEATURES:
            out[k] = koi_model._to_float(v)  # reutilizamos util del modelo
    return out

@app.on_event("startup")
def on_startup():
    """Entrena el modelo en memoria al iniciar el servidor."""
    data_path = os.getenv("KOI_DATA_PATH", koi_model.DATA_PATH)
    try:
        rf, medians, feats_in_use = koi_model.train_in_memory(data_path)
        # guarda en los globales del módulo (ya lo hace train_in_memory)
        koi_model.RF_MODEL = rf
        koi_model.TRAIN_MEDIANS = medians
        koi_model.FEATURES_IN_USE = feats_in_use
        print("[SERVER] Modelo cargado en memoria. Features:", feats_in_use)
    except Exception as e:
        # si falla, que el servidor no arranque "a ciegas"
        raise RuntimeError(f"No se pudo entrenar el modelo al iniciar: {e}") from e

@app.get("/health")
def health():
    return {"status": "ok", "features": koi_model.FEATURES_IN_USE}

@app.get("/predict")
async def predict(request: Request):
    """
    Devuelve JSON con la probabilidad de CONFIRMED.
    Ejemplo:
    /predict?koi_period=10.5&koi_impact=0.2&koi_duration=3.4&...
    """
    if koi_model.RF_MODEL is None:
        raise HTTPException(500, "Modelo no cargado")

    qs = dict(request.query_params)
    params = _parse_params(qs)


    try:
        proba = koi_model.predict_from_params(params)
        print("[PREDICT] Params recibidos:", params)
        print(f"[PREDICT] Probabilidad CONFIRMED: {proba:.6f}\n\n")
    except Exception as e:
        raise HTTPException(400, f"Error en predicción: {e}")

    return {"proba_confirmed": proba}

@app.get("/predict_raw", response_class=PlainTextResponse)
async def predict_raw(request: Request):
    """
    Devuelve SOLO el número (texto plano).
    Útil si quieres una respuesta mínima: 0.734281
    """
    if koi_model.RF_MODEL is None:
        raise HTTPException(500, "Modelo no cargado")

    qs = dict(request.query_params)
    params = _parse_params(qs)

    try:
        proba = koi_model.predict_from_params(params)
    except Exception as e:
        raise HTTPException(400, f"Error en predicción: {e}")

    # 6 decimales; ajusta si quieres más/menos
    return f"{proba:.6f}"

if __name__ == "__main__":
    import os
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    # Arranca Uvicorn programáticamente y mantiene el proceso en pie
    uvicorn.run(app, host=host, port=port, reload=False)
