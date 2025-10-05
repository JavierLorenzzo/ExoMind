#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from typing import Dict, List, Tuple
import argparse
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# ----------------------------
# Config
# ----------------------------
ALL_FEATURES: List[str] = [
    "koi_period","koi_impact","koi_duration","koi_depth","koi_prad","koi_teq",
    "koi_insol","koi_model_snr","koi_steff","koi_slogg","koi_srad","koi_kepmag",
]
DISPOSITION_COL = "koi_disposition"
POSITIVE_CLASS = "CONFIRMED"
NEGATIVE_CLASS = "FALSE POSITIVE"
DATA_PATH = "./data/koi.csv"

# ----------------------------
# Estado global
# ----------------------------
RF_MODEL: RandomForestClassifier | None = None
TRAIN_MEDIANS: pd.Series | None = None
FEATURES_IN_USE: List[str] = []  # features efectivamente usadas tras limpieza

# ----------------------------
# Utils
# ----------------------------
def _to_float(x):
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return np.nan
    if isinstance(x, (int, float, np.integer, np.floating)):
        return float(x)
    try:
        return float(str(x))
    except Exception:
        return np.nan

def _make_row(params: Dict[str, float], features: List[str]) -> pd.DataFrame:
    row = {f: _to_float(params.get(f, np.nan)) for f in features}
    return pd.DataFrame([row], columns=features)

# ----------------------------
# Entrenamiento simple en memoria
# ----------------------------
def train_in_memory(csv_path: str = DATA_PATH) -> Tuple[RandomForestClassifier, pd.Series, List[str]]:
    df = pd.read_csv(csv_path)

    # Filtrar solo CONFIRMED / FALSE POSITIVE
    df_clean = df[df[DISPOSITION_COL].isin([POSITIVE_CLASS, NEGATIVE_CLASS])].copy()
    if df_clean.empty:
        raise ValueError("No hay filas con CONFIRMED o FALSE POSITIVE en el CSV.")

    # Quedarnos solo con features que existan
    present_feats = [f for f in ALL_FEATURES if f in df_clean.columns]
    if not present_feats:
        raise ValueError("Ninguna de las FEATURES está presente en el CSV.")

    # Subconjunto y label (como Series para poder alinear por índice)
    df_small = df_clean[present_feats + [DISPOSITION_COL]].copy()
    y_series = (df_small[DISPOSITION_COL] == POSITIVE_CLASS).astype(int)

    # Conversión a numérico por celda
    X_all = df_small[present_feats].apply(pd.to_numeric, errors="coerce")

    # Quitar filas completamente NaN
    mask = ~X_all.isna().all(axis=1)
    X = X_all.loc[mask].copy()
    y_series = y_series.loc[mask]           # <-- alineación por índice .loc

    if X.empty:
        raise ValueError("Todas las filas quedaron vacías tras coerción a numérico.")

    # Eliminar columnas completamente NaN (por si alguna feature queda vacía en todas las filas)
    cols_all_nan = X.columns[X.isna().all()].tolist()
    if cols_all_nan:
        X = X.drop(columns=cols_all_nan)

    feats_in_use = list(X.columns)
    if not feats_in_use:
        raise ValueError("Todas las columnas quedaron vacías; no hay features utilizables.")

    # Imputación por medianas del entrenamiento (sin pipeline)
    medians = X.median(numeric_only=True)
    X = X.fillna(medians)

    # Entrenar
    rf = RandomForestClassifier(
        n_estimators=500,
        max_depth=None,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X.values, y_series.values)       # ahora ambas son 2D/1D bien alineadas

    print("[INFO] Entrenamiento en memoria OK")
    print(f"[INFO] Muestras: {len(y_series)} | Positivos={int(y_series.sum())} | Negativos={int((1-y_series).sum())}")
    print(f"[INFO] Features usadas ({len(feats_in_use)}): {feats_in_use}")

    return rf, medians, feats_in_use

from sklearn.metrics import accuracy_score, roc_auc_score, precision_recall_fscore_support
from sklearn.model_selection import train_test_split

def evaluate_on_test(csv_path: str = DATA_PATH, test_size: float = 0.25, random_state: int = 42) -> dict:
    """
    Carga el CSV, hace el mismo preprocesado simple que el entrenamiento,
    divide en train/test, entrena SOLO en train y reporta métricas en test.
    No modifica el modelo global en memoria.
    """
    df = pd.read_csv(csv_path)

    # Filtrar solo CONFIRMED / FALSE POSITIVE
    df_clean = df[df[DISPOSITION_COL].isin([POSITIVE_CLASS, NEGATIVE_CLASS])].copy()
    if df_clean.empty:
        raise ValueError("No hay filas con CONFIRMED o FALSE POSITIVE en el CSV.")

    # Features presentes
    present_feats = [f for f in ALL_FEATURES if f in df_clean.columns]
    if not present_feats:
        raise ValueError("Ninguna de las FEATURES está presente en el CSV.")

    # Subconjunto + etiqueta
    df_small = df_clean[present_feats + [DISPOSITION_COL]].copy()
    y = (df_small[DISPOSITION_COL] == POSITIVE_CLASS).astype(int)
    X = df_small[present_feats].apply(pd.to_numeric, errors="coerce")

    # Quitar filas completamente NaN
    mask = ~X.isna().all(axis=1)
    X = X.loc[mask].copy()
    y = y.loc[mask].copy()

    if X.empty:
        raise ValueError("Todas las filas quedaron vacías tras coerción a numérico.")

    # Quitar columnas completamente NaN
    cols_all_nan = X.columns[X.isna().all()].tolist()
    if cols_all_nan:
        X = X.drop(columns=cols_all_nan)

    feats_in_use = list(X.columns)
    if not feats_in_use:
        raise ValueError("Todas las columnas quedaron vacías; no hay features utilizables.")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    # Imputación por medianas calculadas en el train
    medians = X_train.median(numeric_only=True)
    X_train = X_train.fillna(medians)
    X_test  = X_test.fillna(medians)

    # Entrenar modelo para evaluar
    rf_eval = RandomForestClassifier(
        n_estimators=500, max_depth=None, random_state=42, n_jobs=-1
    )
    rf_eval.fit(X_train.values, y_train.values)

    # Métricas en test
    proba_test = rf_eval.predict_proba(X_test.values)[:, 1]
    y_pred_test = (proba_test >= 0.5).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test.values, y_pred_test, average="binary", zero_division=0
    )
    acc = float(accuracy_score(y_test.values, y_pred_test))
    try:
        auc = float(roc_auc_score(y_test.values, proba_test))
    except ValueError:
        auc = float("nan")

    return {
        "n_train": int(len(y_train)),
        "n_test": int(len(y_test)),
        "features_used": feats_in_use,
        "accuracy": acc,
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "roc_auc": auc,
    }

def show_evaluation_statistics(stats: dict) -> None:
    def _fmt(value) -> str:
        try:
            if value is None or np.isnan(value):
                return "nan"
        except TypeError:
            try:
                value = float(value)
            except (TypeError, ValueError):
                return str(value)
        return f"{float(value):.4f}"

    print("[STATS] Evaluacion hold-out")
    print(f"  Muestras train: {stats.get('n_train', 0)} | test: {stats.get('n_test', 0)}")
    print(f"  Accuracy : {_fmt(stats.get('accuracy'))}")
    print(f"  Precision: {_fmt(stats.get('precision'))}")
    print(f"  Recall   : {_fmt(stats.get('recall'))}")
    print(f"  F1       : {_fmt(stats.get('f1'))}")
    print(f"  ROC AUC  : {_fmt(stats.get('roc_auc'))}")

    features = stats.get("features_used") or []
    if features:
        print(f"  Features utilizadas: {features}")

# ----------------------------
# Predicción
# ----------------------------
def predict_from_params(params: Dict[str, float], threshold: float = 0.5) -> float:
    """
    Devuelve ÚNICAMENTE la probabilidad de CONFIRMED (float en [0,1]).
    Ignora el umbral para la salida (se mantiene el arg por compatibilidad).
    """
    if RF_MODEL is None or TRAIN_MEDIANS is None or not FEATURES_IN_USE:
        raise RuntimeError("Modelo no cargado. Llama a train_in_memory() primero.")

    # Construir fila en el orden de FEATURES_IN_USE
    df = _make_row(params, FEATURES_IN_USE)

    # Imputar con medianas del entrenamiento
    for f in FEATURES_IN_USE:
        val = df.at[0, f]
        if val is None or (isinstance(val, float) and np.isnan(val)):
            df.at[0, f] = TRAIN_MEDIANS.get(f, np.nan)

    proba = float(RF_MODEL.predict_proba(df.values)[0, 1])
    return proba

# ----------------------------
# CLI mínima
# ----------------------------

def parse_kv_list(kv_list: List[str]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for kv in kv_list or []:
        if "=" in kv:
            k, v = kv.split("=", 1)
            out[k.strip()] = _to_float(v.strip())
    return out

def main():
    global RF_MODEL, TRAIN_MEDIANS, FEATURES_IN_USE

    parser = argparse.ArgumentParser(description="RF KOI simple (entrena al arrancar y predice en memoria).")
    parser.add_argument("--data", default=DATA_PATH, help="Ruta al CSV de KOI.")
    parser.add_argument("--threshold", type=float, default=0.5, help="Umbral de clasificación.")
    grp = parser.add_mutually_exclusive_group(required=False)
    grp.add_argument("--json", help="JSON con features para una predicción.")
    grp.add_argument("--param", action="append", help="Par clave=valor (repetible).")
    args = parser.parse_args()

    RF_MODEL, TRAIN_MEDIANS, FEATURES_IN_USE = train_in_memory(args.data)
    try:
        stats = evaluate_on_test(args.data)
        show_evaluation_statistics(stats)
    except Exception as exc:
        print(f"[WARN] No fue posible calcular las metricas: {exc}")

    if args.json or args.param:
        params = {}
        if args.json:
            params = {k: _to_float(v) for k, v in json.loads(args.json).items()}
        elif args.param:
            params = parse_kv_list(args.param)

        res = predict_from_params(params, threshold=args.threshold)
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print("[OK] Modelo listo en memoria. Importa 'predict_from_params' desde tu servicio.")

if __name__ == "__main__":
    main()
