"""Generate a seeded synthetic history of mid-market commercial loans.

Stand-in for Bank of America's internal loan book (not public). Outcomes are drawn from
logistic functions of real credit drivers (coverage, leverage, margins, credit, collateral),
so models trained on it learn realistic relationships.

Run from backend/:  python -m data.generate_data
"""
from pathlib import Path

import numpy as np
import pandas as pd

from app.features import BASE_RATE, FEATURES, INDUSTRIES, LOAN_TYPES, build_features

N = 6000
rng = np.random.default_rng(42)
OUT = Path(__file__).parent / "loans.csv"


def sigmoid(z):
    return 1 / (1 + np.exp(-z))


def true_default_logit(f):
    return (
        -3.1
        + 1.6 * (f["industry_risk"] - 0.45)
        - 1.5 * (min(f["post_dscr"], 4) - 1.6)
        + 0.30 * (min(f["post_leverage"], 10) - 3)
        - 6.0 * (f["ebitda_margin"] - 0.13)
        - 2.5 * f["revenue_growth"]
        - 0.012 * (f["credit_score"] - 700)
        - 0.45 * (min(f["collateral_coverage"], 2.5) - 1)
        - 0.04 * (min(f["years_in_business"], 30) - 10)
        - 0.5 * (min(f["current_ratio"], 3) - 1.5)
        + 0.04 * (f["term_years"] - 5)
    )


def approval_logit(f):
    return (
        1.0
        + 2.2 * (min(f["post_dscr"], 3) - 1.25)
        - 0.45 * (min(f["post_leverage"], 10) - 3.5)
        + 0.015 * (f["credit_score"] - 690)
        + 0.6 * (min(f["collateral_coverage"], 2) - 0.8)
        + 0.05 * (min(f["years_in_business"], 20) - 5)
        - 1.2 * (f["industry_risk"] - 0.45)
    )


def main():
    industries = list(INDUSTRIES)
    loan_types = list(LOAN_TYPES)
    rows = []
    for i in range(N):
        industry = rng.choice(industries)
        risk = INDUSTRIES[industry]
        revenue = float(10 ** rng.uniform(7, 9))  # $10M - $1B
        margin = float(np.clip(rng.normal(0.14 - 0.06 * risk, 0.06), -0.05, 0.40))
        ebitda = revenue * max(margin, 0.005)
        company = {
            "industry": industry,
            "years_in_business": int(np.clip(rng.gamma(2.2, 9), 1, 80)),
            "annual_revenue": revenue,
            "ebitda_margin": margin,
            "revenue_growth": float(np.clip(rng.normal(0.05, 0.12), -0.35, 0.60)),
            "current_ratio": float(np.clip(rng.normal(1.6, 0.5), 0.5, 4.0)),
            "credit_score": int(np.clip(rng.normal(705, 55), 520, 850)),
            "existing_debt": float(ebitda * np.clip(rng.gamma(2.0, 1.1), 0, 8)),
            "collateral_value": float(revenue * np.clip(rng.gamma(2.0, 0.12), 0.01, 1.5)),
        }
        loan_type = rng.choice(loan_types, p=[0.45, 0.25, 0.15, 0.15])
        terms = LOAN_TYPES[loan_type][3]
        term = int(rng.choice(terms))
        amount = float(ebitda * np.clip(rng.gamma(2.0, 0.9), 0.1, 7))

        # Bank priced the loan off its own risk view at the time.
        f0 = build_features(company, amount, term, loan_type, BASE_RATE + 3)
        pd0 = sigmoid(true_default_logit(f0))
        rate = BASE_RATE + 1.5 + 22 * pd0 + 0.08 * (term - 3) + LOAN_TYPES[loan_type][1]
        rate = float(np.clip(rate + rng.normal(0, 0.3), BASE_RATE + 0.75, 18))
        f = build_features(company, amount, term, loan_type, rate)
        f = {k: float(v) for k, v in f.items()}

        approved = rng.random() < sigmoid(approval_logit(f) + rng.normal(0, 0.5))
        defaulted = approved and rng.random() < sigmoid(true_default_logit(f) + rng.normal(0, 0.35))
        rows.append(
            {
                "loan_id": f"BOA-{100000 + i}",
                **company,
                "loan_type": loan_type,
                "amount": round(amount, 2),
                "term_years": term,
                "rate_pct": round(rate, 3),
                **{k: f[k] for k in FEATURES if k not in ("years_in_business", "ebitda_margin", "revenue_growth",
                                                         "current_ratio", "credit_score", "term_years")},
                "approved": int(approved),
                "defaulted": int(defaulted),
            }
        )
    df = pd.DataFrame(rows)
    df.to_csv(OUT, index=False)
    print(f"Wrote {len(df)} loans to {OUT}")
    print(f"Approval rate: {df.approved.mean():.1%}")
    print(f"Default rate (approved loans): {df[df.approved == 1].defaulted.mean():.1%}")


if __name__ == "__main__":
    main()
