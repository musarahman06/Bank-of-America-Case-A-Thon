"""Shared loan math and model features, used by data generation, training and the live engine."""
import numpy as np

INDUSTRIES = {
    # name: relative risk (0 = safest, 1 = riskiest)
    "Healthcare": 0.20,
    "Professional Services": 0.25,
    "Technology": 0.40,
    "Manufacturing": 0.35,
    "Wholesale Distribution": 0.40,
    "Energy": 0.55,
    "Transportation & Logistics": 0.55,
    "Construction": 0.65,
    "Retail": 0.70,
    "Hospitality": 0.85,
}

LOAN_TYPES = {
    # name: (code, rate adjustment %, amortizing?, allowed terms in years)
    "Term Loan": (0, 0.00, True, [3, 5, 7, 10]),
    "Line of Credit": (1, 0.25, False, [1, 2, 3]),
    "Equipment Financing": (2, -0.15, True, [3, 5, 7]),
    "Commercial Real Estate": (3, -0.25, True, [10, 15, 20]),
}

BASE_RATE = 4.75  # illustrative floating base rate, %
EXISTING_DEBT_RATE = 0.07
EXISTING_DEBT_TERM = 7

FEATURES = [
    "industry_risk",
    "years_in_business",
    "log_revenue",
    "ebitda_margin",
    "revenue_growth",
    "current_ratio",
    "credit_score",
    "post_dscr",
    "post_leverage",
    "collateral_coverage",
    "loan_to_revenue",
    "term_years",
    "loan_type_code",
]


def annual_payment(principal, rate, years, amortizing=True):
    """Annual debt service for a loan. Works on scalars or numpy arrays."""
    principal = np.asarray(principal, dtype=float)
    rate = np.asarray(rate, dtype=float)
    years = np.asarray(years, dtype=float)
    amort = principal * rate / (1 - (1 + rate) ** (-years))
    interest_only = principal * rate
    return np.where(amortizing, amort, interest_only)


def existing_debt_service(existing_debt):
    return annual_payment(existing_debt, EXISTING_DEBT_RATE, EXISTING_DEBT_TERM)


def build_features(company: dict, amount, term_years, loan_type: str, rate_pct):
    """Feature dict for a company + loan. amount/term/rate may be numpy arrays (grid scoring)."""
    code, _, amortizing, _ = LOAN_TYPES[loan_type]
    ebitda = company["annual_revenue"] * company["ebitda_margin"]
    new_service = annual_payment(amount, np.asarray(rate_pct) / 100, term_years, amortizing)
    total_service = existing_debt_service(company["existing_debt"]) + new_service
    amount = np.asarray(amount, dtype=float)
    return {
        "industry_risk": INDUSTRIES[company["industry"]],
        "years_in_business": company["years_in_business"],
        "log_revenue": np.log10(company["annual_revenue"]),
        "ebitda_margin": company["ebitda_margin"],
        "revenue_growth": company["revenue_growth"],
        "current_ratio": company["current_ratio"],
        "credit_score": company["credit_score"],
        "post_dscr": np.clip(ebitda / np.maximum(total_service, 1), -2, 10),
        "post_leverage": np.clip((company["existing_debt"] + amount) / max(ebitda, 1), 0, 30),
        "collateral_coverage": np.clip(company["collateral_value"] / np.maximum(amount, 1), 0, 10),
        "loan_to_revenue": amount / company["annual_revenue"],
        "term_years": np.asarray(term_years, dtype=float),
        "loan_type_code": code,
    }
