"""Where inside Bank of America a loan's money comes from.

Funding mix from BofA's 4Q25 investor presentation (period ended Dec 31, 2025):
average deposits by segment, period-end long-term debt and common equity, and the
standardized CET1 ratio. A loan is illustratively funded in proportion to this mix,
except for the equity capital regulators require BofA to hold against it, which
scales with the loan's risk.
"""

SOURCE = "Bank of America 4Q25 Investor Presentation (Dec 31, 2025)"

# $ billions
DEPOSITS_BY_SEGMENT = {
    "Consumer Banking": 945.4,
    "Global Wealth & Investment Mgmt": 279.5,
    "Global Banking": 656.1,
    "Global Markets & Other": 129.0,  # remainder of ~$2.01T average deposits
}
LONG_TERM_DEBT = 318.0
COMMON_EQUITY = 277.0
CET1_RATIO = 0.114  # standardized approach

# Illustrative risk weights by our 1-5 risk tier (Basel standardized corporate exposure is 100%).
RISK_WEIGHTS = {1: 0.65, 2: 0.85, 3: 1.00, 4: 1.30, 5: 1.50}

DEPOSITS_TOTAL = sum(DEPOSITS_BY_SEGMENT.values())


def funding_breakdown(amount: float, risk: int) -> dict:
    risk_weight = RISK_WEIGHTS[risk]
    equity = amount * risk_weight * CET1_RATIO
    borrowed = amount - equity
    deposit_share = DEPOSITS_TOTAL / (DEPOSITS_TOTAL + LONG_TERM_DEBT)

    deposits = {seg: borrowed * deposit_share * bal / DEPOSITS_TOTAL for seg, bal in DEPOSITS_BY_SEGMENT.items()}
    debt = borrowed * (1 - deposit_share)

    sources = [
        *({"name": f"{seg} deposits", "group": "Client Deposits", "amount": round(v, 2)} for seg, v in deposits.items()),
        {"name": "BofA bonds (long-term debt)", "group": "Wholesale Funding", "amount": round(debt, 2)},
        {"name": "Shareholders' equity (CET1)", "group": "Bank Capital", "amount": round(equity, 2)},
    ]
    groups = {}
    for s in sources:
        groups[s["group"]] = groups.get(s["group"], 0) + s["amount"]

    return {
        "loan_amount": round(amount, 2),
        "sources": sources,
        "groups": [{"name": k, "amount": round(v, 2)} for k, v in groups.items()],
        "equity_capital_held": round(equity, 2),
        "risk_weight": risk_weight,
        "cet1_ratio": CET1_RATIO,
        "balance_sheet": {
            "deposits_by_segment_bn": DEPOSITS_BY_SEGMENT,
            "long_term_debt_bn": LONG_TERM_DEBT,
            "common_equity_bn": COMMON_EQUITY,
        },
        "source": SOURCE,
        "note": "Illustrative: banks fund loans from a pooled balance sheet, so this shows the loan "
        "allocated in proportion to BofA's funding mix, plus the capital held against its risk.",
    }
