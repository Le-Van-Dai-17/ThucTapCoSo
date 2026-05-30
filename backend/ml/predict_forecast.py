import os
import sys
import json
import joblib
import pandas as pd
import warnings

try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except Exception:
    pass


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "forecast_pipeline.pkl")


def main():
    try:
        payload = json.load(sys.stdin)
        items = payload.get("items", [])

        if not items:
            raise ValueError("Không có dữ liệu đầu vào để dự đoán")

        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Không tìm thấy model tại: {MODEL_PATH}")

        pipeline = joblib.load(MODEL_PATH)

        input_df = pd.DataFrame(items)

        required_columns = [
            "product_code",
            "lag_1",
            "lag_2",
            "lag_3",
            "target_month"
        ]

        for col in required_columns:
            if col not in input_df.columns:
                raise ValueError(f"Thiếu cột bắt buộc: {col}")

        input_df = input_df[required_columns]

        input_df["product_code"] = input_df["product_code"].astype(str)
        input_df["lag_1"] = input_df["lag_1"].astype(float)
        input_df["lag_2"] = input_df["lag_2"].astype(float)
        input_df["lag_3"] = input_df["lag_3"].astype(float)
        input_df["target_month"] = input_df["target_month"].astype(int)

        predictions = pipeline.predict(input_df)

        results = []

        for item, pred in zip(items, predictions):
            predicted_quantity = max(0, int(round(float(pred))))

            results.append({
                "product_code": item["product_code"],
                "predicted_quantity": predicted_quantity
            })

        print(json.dumps({
            "success": True,
            "predictions": results
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": str(e)
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()