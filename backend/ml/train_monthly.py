import json
import math
import os
import sys
from datetime import datetime

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
FEATURE_COLUMNS = ["product_code", "lag_1", "lag_2", "lag_3", "target_month"]


def safe_mape(y_true, y_pred):
    pairs = [(float(a), float(p)) for a, p in zip(y_true, y_pred) if float(a) > 0]
    if not pairs:
        return None
    return sum(abs(a - p) / a for a, p in pairs) / len(pairs) * 100


def build_monthly_frame(rows):
    if not rows:
        raise ValueError("No sales history provided")

    df = pd.DataFrame(rows)
    required = {"product_code", "month_key", "quantity"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {', '.join(sorted(missing))}")

    df["product_code"] = df["product_code"].astype(str)
    df["month_key"] = pd.to_datetime(df["month_key"].astype(str) + "-01", errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df = df.dropna(subset=["month_key"])

    monthly = (
        df.groupby(["product_code", "month_key"], as_index=False)["quantity"]
        .sum()
        .sort_values(["product_code", "month_key"])
    )

    if monthly.empty:
        raise ValueError("Sales history is empty after aggregation")

    for lag in [1, 2, 3]:
        monthly[f"lag_{lag}"] = monthly.groupby("product_code")["quantity"].shift(lag)

    monthly["target_month"] = monthly["month_key"].dt.month
    supervised = monthly.dropna(subset=["lag_1", "lag_2", "lag_3"]).copy()

    if supervised.empty:
        raise ValueError("Need at least 4 months of sales history per product to train")

    return supervised


def make_pipeline():
    preprocessor = ColumnTransformer(
        transformers=[
            ("product", OneHotEncoder(handle_unknown="ignore"), ["product_code"]),
            ("numeric", "passthrough", ["lag_1", "lag_2", "lag_3", "target_month"]),
        ]
    )

    model = RandomForestRegressor(
        n_estimators=180,
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    return Pipeline([
        ("preprocess", preprocessor),
        ("model", model),
    ])


def main():
    try:
        payload = json.load(sys.stdin)
        rows = payload.get("sales_history", [])
        version_tag = payload.get("version_tag") or f"model_v{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        supervised = build_monthly_frame(rows)
        validation_month = supervised["month_key"].max()
        train_df = supervised[supervised["month_key"] < validation_month].copy()
        validation_df = supervised[supervised["month_key"] == validation_month].copy()

        if train_df.empty or validation_df.empty:
            raise ValueError("Not enough data for train/validation split using latest month")

        pipeline = make_pipeline()
        pipeline.fit(train_df[FEATURE_COLUMNS], train_df["quantity"])

        predictions = pipeline.predict(validation_df[FEATURE_COLUMNS])
        predictions = [max(0, float(p)) for p in predictions]
        actual = validation_df["quantity"].astype(float).tolist()

        mae = float(mean_absolute_error(actual, predictions))
        rmse = float(math.sqrt(mean_squared_error(actual, predictions)))
        r2 = float(r2_score(actual, predictions)) if len(validation_df) > 1 else 0.0
        mape = safe_mape(actual, predictions)

        os.makedirs(MODELS_DIR, exist_ok=True)
        model_file = f"{version_tag}.pkl"
        model_path = os.path.join(MODELS_DIR, model_file)
        pipeline.fit(supervised[FEATURE_COLUMNS], supervised["quantity"])
        joblib.dump(pipeline, model_path)

        print(json.dumps({
            "success": True,
            "version_tag": version_tag,
            "algorithm_type": "RandomForestRegressor",
            "model_path": os.path.relpath(model_path, BASE_DIR).replace("\\\\", "/"),
            "absolute_model_path": model_path,
            "metrics": {
                "mape_score": mape,
                "mae_score": mae,
                "rmse_score": rmse,
                "r2_score": r2,
            },
            "training_rows": int(len(train_df)),
            "validation_rows": int(len(validation_df)),
            "train_data_range": {
                "start": supervised["month_key"].min().strftime("%Y-%m"),
                "end": train_df["month_key"].max().strftime("%Y-%m"),
            },
            "validation_period": validation_month.strftime("%Y-%m"),
            "feature_columns": FEATURE_COLUMNS,
        }, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"success": False, "message": str(exc)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
