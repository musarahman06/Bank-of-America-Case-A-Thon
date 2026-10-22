"""Train default-risk and approval models on the historical loan book.

Run from backend/:  python -m ml.train
"""
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from app.features import FEATURES

DATA = Path(__file__).parent.parent / "data" / "loans.csv"
ARTIFACTS = Path(__file__).parent / "artifacts"

# +1: higher value -> more likely to default; -1: less likely. Keeps the model's answers explainable.
DEFAULT_MONOTONIC = {
    "industry_risk": 1,
    "years_in_business": -1,
    "log_revenue": 0,
    "ebitda_margin": -1,
    "revenue_growth": -1,
    "current_ratio": -1,
    "credit_score": -1,
    "post_dscr": -1,
    "post_leverage": 1,
    "collateral_coverage": -1,
    "loan_to_revenue": 1,
    "term_years": 1,
    "loan_type_code": 0,
}


def fit(X, y, monotonic):
    model = HistGradientBoostingClassifier(
        learning_rate=0.05,
        max_iter=300,
        max_leaf_nodes=15,
        min_samples_leaf=40,
        l2_regularization=1.0,
        monotonic_cst=[monotonic[f] for f in FEATURES],
        random_state=0,
    )
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
    model.fit(X_tr, y_tr)
    auc = roc_auc_score(y_te, model.predict_proba(X_te)[:, 1])
    model.fit(X, y)  # refit on everything for serving
    return model, auc


def main():
    df = pd.read_csv(DATA)
    ARTIFACTS.mkdir(exist_ok=True)

    approved = df[df.approved == 1]
    default_model, default_auc = fit(approved[FEATURES], approved.defaulted, DEFAULT_MONOTONIC)
    approval_model, approval_auc = fit(
        df[FEATURES], df.approved, {k: -v for k, v in DEFAULT_MONOTONIC.items()}
    )

    joblib.dump(default_model, ARTIFACTS / "default_model.joblib")
    joblib.dump(approval_model, ARTIFACTS / "approval_model.joblib")
    metrics = {
        "default_auc": round(default_auc, 3),
        "approval_auc": round(approval_auc, 3),
        "training_loans": len(df),
        "approved_loans": len(approved),
        "historical_default_rate": round(approved.defaulted.mean(), 4),
        "historical_approval_rate": round(df.approved.mean(), 4),
    }
    (ARTIFACTS / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
