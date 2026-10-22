"""Loan offer generation, scoring and evaluation on top of the trained models."""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .features import BASE_RATE, FEATURES, LOAN_TYPES, build_features
from .funding import funding_breakdown

ROOT = Path(__file__).parent.parent
ARTIFACTS = ROOT / "ml" / "artifacts"

DEFAULT_MODEL = joblib.load(ARTIFACTS / "default_model.joblib")
APPROVAL_MODEL = joblib.load(ARTIFACTS / "approval_model.joblib")
METRICS = json.loads((ARTIFACTS / "metrics.json").read_text())
HISTORY = pd.read_csv(ROOT / "data" / "loans.csv")

MIN_DSCR = 1.25
MAX_LEVERAGE = 4.0
RISK_CUTOFFS = [0.02, 0.05, 0.10, 0.20]  # P(default) upper bounds for risk 1-4; above = 5
RISK_LABELS = {1: "Very Low", 2: "Low", 3: "Moderate", 4: "Elevated", 5: "High"}
SCORE_WEIGHTS = {"approval": 0.30, "affordability": 0.25, "cost": 0.20, "fit": 0.15, "safety": 0.10}


# ---------- core scoring ----------

def _predict(company, amounts, terms, loan_type, rates):
    amounts, terms, rates = np.broadcast_arrays(*(np.atleast_1d(np.asarray(x, dtype=float)) for x in (amounts, terms, rates)))
    feats = build_features(company, amounts, terms, loan_type, rates)
    X = pd.DataFrame({k: np.broadcast_to(feats[k], amounts.shape) for k in FEATURES})
    return feats, X, DEFAULT_MODEL.predict_proba(X)[:, 1], APPROVAL_MODEL.predict_proba(X)[:, 1]


def price(company, amounts, terms, loan_type):
    """Risk-based rate: base + spread from predicted default + term premium + product adjustment."""
    adj = LOAN_TYPES[loan_type][1]
    terms = np.asarray(terms, dtype=float)
    rates = np.full(np.broadcast(np.asarray(amounts), terms).shape, BASE_RATE + 3.0)
    for _ in range(3):
        _, _, p_def, _ = _predict(company, amounts, terms, loan_type, rates)
        rates = np.clip(BASE_RATE + 1.5 + 22 * p_def + 0.08 * (terms - 3) + adj, BASE_RATE + 0.75, 18)
    return np.round(rates, 2)


def risk_tier(p_default):
    return np.searchsorted(RISK_CUTOFFS, p_default) + 1


def _score_parts(p_app, dscr, rate, risk, amount, target):
    parts = {
        "approval": p_app * 100,
        "affordability": np.interp(dscr, [0.8, 1.0, 1.25, 1.5, 2.0, 3.0], [0, 10, 50, 70, 90, 100]),
        "cost": np.interp(rate, [BASE_RATE + 0.75, 14.0], [100, 0]),
        "fit": np.clip(100 * (1 - np.abs(amount - target) / max(target, 1)), 0, 100),
        "safety": (5 - risk) / 4 * 100,
    }
    total = sum(SCORE_WEIGHTS[k] * v for k, v in parts.items())
    return parts, np.clip(np.round(total), 1, 100).astype(int)


def evaluate_grid(company, amounts, terms, loan_type, target, rates=None):
    """Score many (amount, term) candidates at once. Returns a DataFrame."""
    amounts, terms = np.broadcast_arrays(np.atleast_1d(np.asarray(amounts, float)), np.atleast_1d(np.asarray(terms, float)))
    if rates is None:
        rates = price(company, amounts, terms, loan_type)
    rates = np.broadcast_to(np.asarray(rates, float), amounts.shape)
    feats, _, p_def, p_app = _predict(company, amounts, terms, loan_type, rates)
    risk = risk_tier(p_def)
    parts, score = _score_parts(p_app, feats["post_dscr"], rates, risk, amounts, target)
    return pd.DataFrame({
        "amount": amounts, "term_years": terms, "rate_pct": rates,
        "p_default": p_def, "p_approval": p_app, "risk": risk, "score": score,
        "post_dscr": np.broadcast_to(feats["post_dscr"], amounts.shape),
        "post_leverage": np.broadcast_to(feats["post_leverage"], amounts.shape),
        "collateral_coverage": np.broadcast_to(feats["collateral_coverage"], amounts.shape),
        **{f"score_{k}": np.broadcast_to(v, amounts.shape) for k, v in parts.items()},
    })


# ---------- presentation helpers ----------

def schedule(amount, rate_pct, term_years, loan_type):
    """Monthly payment, total interest and year-end balances."""
    amortizing = LOAN_TYPES[loan_type][2]
    r, n = rate_pct / 100 / 12, int(term_years * 12)
    if amortizing:
        pmt = amount * r / (1 - (1 + r) ** -n)
        balances = [amount * (1 + r) ** (12 * y) - pmt * ((1 + r) ** (12 * y) - 1) / r for y in range(int(term_years) + 1)]
        total_interest = pmt * n - amount
    else:  # revolving line: interest-only, principal due at maturity
        pmt = amount * r
        balances = [amount] * int(term_years) + [0.0]
        total_interest = pmt * n
    return {
        "monthly_payment": round(pmt, 2),
        "total_interest": round(total_interest, 2),
        "balances": [{"year": y, "balance": round(max(b, 0), 2)} for y, b in enumerate(balances)],
    }


def ebitda(company):
    return company["annual_revenue"] * company["ebitda_margin"]


def to_offer(row, company, loan_type, label, tagline):
    amount, rate, term = float(row.amount), float(row.rate_pct), float(row.term_years)
    risk = int(row.risk)
    sched = schedule(amount, rate, term, loan_type)
    return {
        "label": label,
        "tagline": tagline,
        "loan_type": loan_type,
        "amount": round(amount, -3),
        "term_years": int(term),
        "rate_pct": rate,
        **sched,
        "score": int(row.score),
        "score_breakdown": {k: round(float(row[f"score_{k}"]), 1) for k in SCORE_WEIGHTS},
        "risk": risk,
        "risk_label": RISK_LABELS[risk],
        "p_default": round(float(row.p_default), 4),
        "p_approval": round(float(row.p_approval), 4),
        "post_dscr": round(float(row.post_dscr), 2),
        "post_leverage": round(float(row.post_leverage), 2),
        "collateral_coverage": round(float(row.collateral_coverage), 2),
        "monthly_cash_flow": round(ebitda(company) / 12, 2),
        "funding": funding_breakdown(amount, risk),
    }


# ---------- capacity, comparables, factors ----------

def capacity(company, loan_type):
    """Largest amount meeting BofA's coverage and leverage guidelines, per term."""
    e = max(ebitda(company), 1)
    amounts = np.linspace(e * 0.05, e * 8, 160)
    out = []
    for term in LOAN_TYPES[loan_type][3]:
        g = evaluate_grid(company, amounts, term, loan_type, target=amounts.mean())
        ok = g[(g.post_dscr >= MIN_DSCR) & (g.post_leverage <= MAX_LEVERAGE)]
        out.append({"term_years": term, "max_amount": round(float(ok.amount.max()), -3) if len(ok) else 0.0})
    return out


def comparables(company, loan, k=200):
    """Historical BofA-style loans most similar to this company + loan."""
    cols = ["log_revenue", "ebitda_margin", "post_leverage", "post_dscr", "credit_score", "industry_risk", "loan_to_revenue"]
    feats = build_features(company, loan["amount"], loan["term_years"], loan["loan_type"], loan["rate_pct"])
    hist = HISTORY[cols]
    mu, sd = hist.mean(), hist.std()
    me = pd.Series({c: float(np.asarray(feats[c])) for c in cols})
    dist = (((hist - mu) / sd - (me - mu) / sd) ** 2).sum(axis=1)
    near = HISTORY.loc[dist.nsmallest(k).index]
    approved = near[near.approved == 1]
    return {
        "count": len(near),
        "approval_rate": round(float(near.approved.mean()), 4),
        "default_rate": round(float(approved.defaulted.mean()) if len(approved) else 0.0, 4),
        "avg_rate_pct": round(float(approved.rate_pct.mean()) if len(approved) else 0.0, 2),
        "median_amount": round(float(near.amount.median()), -3),
    }


def _history_curve():
    bins = [-np.inf, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, np.inf]
    labels = ["<1.0x", "1.0-1.25x", "1.25-1.5x", "1.5-2.0x", "2.0-2.5x", "2.5-3.0x", ">3.0x"]
    h = HISTORY.assign(bucket=pd.cut(HISTORY.post_dscr, bins, labels=labels))
    rows = []
    for label, g in h.groupby("bucket", observed=False):
        a = g[g.approved == 1]
        rows.append({
            "bucket": label,
            "approval_rate": round(float(g.approved.mean()), 4),
            "default_rate": round(float(a.defaulted.mean()) if len(a) else 0, 4),
            "loans": len(g),
        })
    return rows, bins, labels


HISTORY_CURVE, _BINS, _LABELS = _history_curve()


def dscr_bucket(dscr):
    return _LABELS[int(np.digitize(dscr, _BINS[1:-1]))]


def factors(company, loan, target, fixed_rate=None):
    """What's helping or holding back this loan: rule checks plus model what-if impact.

    fixed_rate: client-proposed rate to hold constant; otherwise the loan is re-priced per scenario.
    """
    base = evaluate_grid(company, loan["amount"], loan["term_years"], loan["loan_type"], target, fixed_rate).iloc[0]

    def what_if(**changes):
        alt = {**company, **changes}
        r = evaluate_grid(alt, loan["amount"], loan["term_years"], loan["loan_type"], target, fixed_rate).iloc[0]
        return int(r.score - base.score), round(float(base.p_default - r.p_default), 4)

    amt = loan["amount"]
    checks = [
        ("Debt service coverage (DSCR)", base.post_dscr, f"{base.post_dscr:.2f}x", f"≥ {MIN_DSCR}x",
         "bad" if base.post_dscr < MIN_DSCR else "warn" if base.post_dscr < 1.5 else "ok",
         what_if(existing_debt=company["existing_debt"] * 0.6)
         if company["existing_debt"] > 0 else (0, 0.0),
         "Pay down existing debt or choose a smaller amount / longer term to lift coverage."),
        ("Leverage (Debt / EBITDA)", base.post_leverage, f"{base.post_leverage:.1f}x", f"≤ {MAX_LEVERAGE}x",
         "bad" if base.post_leverage > MAX_LEVERAGE else "warn" if base.post_leverage > 3 else "ok",
         what_if(existing_debt=company["existing_debt"] * 0.6) if company["existing_debt"] > 0 else (0, 0.0),
         "Total debt is high relative to earnings; reduce existing debt before adding more."),
        ("Business credit score", company["credit_score"], str(company["credit_score"]), "≥ 700",
         "bad" if company["credit_score"] < 650 else "warn" if company["credit_score"] < 700 else "ok",
         what_if(credit_score=max(company["credit_score"], 740)),
         "Improve on-time payment history and lower credit utilization."),
        ("EBITDA margin", company["ebitda_margin"], f"{company['ebitda_margin']:.1%}", "≥ 12%",
         "bad" if company["ebitda_margin"] < 0.06 else "warn" if company["ebitda_margin"] < 0.12 else "ok",
         what_if(ebitda_margin=max(company["ebitda_margin"], 0.15)),
         "Thin margins leave little cushion; cost or pricing improvements strengthen the file."),
        ("Collateral coverage", base.collateral_coverage, f"{base.collateral_coverage:.2f}x", "≥ 1.0x",
         "bad" if base.collateral_coverage < 0.5 else "warn" if base.collateral_coverage < 1.0 else "ok",
         what_if(collateral_value=max(company["collateral_value"], amt * 1.25)),
         "Pledging additional assets (equipment, real estate, receivables) lowers risk and rate."),
        ("Liquidity (current ratio)", company["current_ratio"], f"{company['current_ratio']:.2f}", "≥ 1.2",
         "bad" if company["current_ratio"] < 1.0 else "warn" if company["current_ratio"] < 1.2 else "ok",
         what_if(current_ratio=max(company["current_ratio"], 1.8)),
         "Build working-capital cushion (cash, receivables) relative to short-term liabilities."),
        ("Revenue growth", company["revenue_growth"], f"{company['revenue_growth']:+.1%}", "≥ 0%",
         "bad" if company["revenue_growth"] < -0.1 else "warn" if company["revenue_growth"] < 0 else "ok",
         what_if(revenue_growth=max(company["revenue_growth"], 0.05)),
         "Declining revenue raises risk; a recovery plan or backlog evidence helps."),
        ("Years in business", company["years_in_business"], f"{company['years_in_business']} yrs", "≥ 5 yrs",
         "warn" if company["years_in_business"] < 5 else "ok", (0, 0.0),
         "Shorter operating history; a guarantor or extra collateral can offset it."),
    ]
    out = []
    for name, _, value, benchmark, status, (gain, pd_drop), tip in checks:
        out.append({
            "factor": name, "value": value, "benchmark": benchmark, "status": status,
            "score_gain_if_fixed": max(gain, 0), "default_risk_drop": max(pd_drop, 0.0),
            "tip": tip if status != "ok" else "",
        })
    order = {"bad": 0, "warn": 1, "ok": 2}
    out.sort(key=lambda f: (order[f["status"]], -f["score_gain_if_fixed"]))
    return out


def risk_matrix(company, loan_type, center_amount):
    """Risk tier and score across amount x term around a center amount (for the heat matrix)."""
    center = max(center_amount, 1)
    amounts = [round(center * f, -4) for f in (0.5, 0.75, 1.0, 1.25, 1.5)]
    terms = LOAN_TYPES[loan_type][3]
    A, T = np.meshgrid(amounts, terms)
    g = evaluate_grid(company, A.ravel(), T.ravel(), loan_type, target=center)
    return {
        "amounts": amounts,
        "terms": terms,
        "cells": [
            {"amount": float(r.amount), "term_years": int(r.term_years), "risk": int(r.risk), "score": int(r.score)}
            for r in g.itertuples()
        ],
    }


# ---------- offer selection ----------

def _candidates(company, loan_type, target, cap_max, anchor=None):
    e = max(ebitda(company), 1)
    top = cap_max if cap_max > 0 else e * 1.0
    amounts = list(np.linspace(0.25, 1.0, 16) * top)
    for x in (target, anchor):
        if x:
            amounts += list(np.array([0.6, 0.75, 0.9, 1.0]) * x)
    amounts = np.array(sorted({round(a, -4) for a in amounts if a > 0}))
    terms = LOAN_TYPES[loan_type][3]
    A, T = np.meshgrid(amounts, terms)
    return evaluate_grid(company, A.ravel(), T.ravel(), loan_type, target)


def _pick(df, chosen, sort_by, ascending):
    for idx in df.sort_values(sort_by, ascending=ascending).index:
        if all(abs(df.at[idx, "amount"] - df.at[c, "amount"]) > 0.05 * df.at[c, "amount"]
               or df.at[idx, "term_years"] != df.at[c, "term_years"] for c in chosen):
            return idx
    return None


def three_offers(company, loan_type, target, cap_max, anchor=None, closest_label=None):
    g = _candidates(company, loan_type, target, cap_max, anchor)
    healthy = g[(g.post_dscr >= MIN_DSCR) & (g.post_leverage <= MAX_LEVERAGE)]
    pool = healthy if len(healthy) >= 3 else g

    chosen, offers = [], []
    best = _pick(pool, chosen, ["score", "amount"], [False, False])
    chosen.append(best)
    offers.append(("Best Match", "Highest overall score: strong balance of approval odds, affordability and cost"))

    if closest_label:
        near = pool.assign(gap=(pool.amount - anchor).abs())
        idx = _pick(near, chosen, ["gap", "score"], [True, False])
        tag = "Closest to what you asked for, adjusted to meet BofA's guidelines"
        label = closest_label
    else:
        idx = _pick(pool, chosen, ["amount", "score"], [False, False])
        tag = "The most you can borrow while staying within coverage and leverage guidelines"
        label = "Maximum Capacity"
    if idx is not None:
        chosen.append(idx)
        offers.append((label, tag))

    floor = 0.5 * (anchor or target)
    cheap = pool[pool.amount >= floor] if (pool.amount >= floor).any() else pool
    idx = _pick(cheap.assign(cost=cheap.rate_pct * cheap.amount * cheap.term_years), chosen, ["cost", "score"], [True, False])
    if idx is not None:
        chosen.append(idx)
        offers.append(("Lowest Cost", "Least total interest paid: smaller amount and/or shorter term"))

    result = [to_offer(g.loc[i], company, loan_type, lbl, tag) for i, (lbl, tag) in zip(chosen, offers)]
    top = max(result, key=lambda o: o["score"])
    for o in result:
        o["recommended"] = o is top
    return result


# ---------- public API ----------

def make_offers(company, loan_type="Term Loan", desired_amount=None):
    caps = capacity(company, loan_type)
    cap_max = max(c["max_amount"] for c in caps)
    target = desired_amount or (cap_max * 0.6 if cap_max else ebitda(company) * 0.5)
    offers = three_offers(company, loan_type, target, cap_max, anchor=desired_amount)
    best = max(offers, key=lambda o: o["score"])
    return {
        "company": company,
        "loan_type": loan_type,
        "desired_amount": desired_amount,
        "capacity": {"max_amount": cap_max, "by_term": caps, "meets_guidelines": cap_max > 0},
        "offers": offers,
        "factors": factors(company, best, target),
        "comparables": comparables(company, best),
        "history_curve": HISTORY_CURVE,
        "best_dscr_bucket": dscr_bucket(best["post_dscr"]),
        "risk_matrix": risk_matrix(company, loan_type, best["amount"]),
        "model": METRICS,
    }


def evaluate_request(company, amount, term_years, loan_type, rate_pct=None):
    fair_rate = float(price(company, amount, term_years, loan_type)[0])
    rate = rate_pct if rate_pct else fair_rate
    row = evaluate_grid(company, amount, term_years, loan_type, target=amount, rates=rate).iloc[0]
    requested = to_offer(row, company, loan_type, "Your Request", "The loan as you requested it")
    requested["fair_rate_pct"] = fair_rate

    score = requested["score"]
    verdict = "Good" if score >= 75 else "Caution" if score >= 50 else "Not Recommended"

    caps = capacity(company, loan_type)
    cap_max = max(c["max_amount"] for c in caps)
    alternatives = three_offers(company, loan_type, amount, cap_max, anchor=amount, closest_label="Closest to Request")
    for a in alternatives:
        a["score_vs_request"] = a["score"] - score

    loan = {"amount": amount, "term_years": term_years, "loan_type": loan_type, "rate_pct": rate}
    flags = []
    if rate_pct and rate_pct < fair_rate - 0.25:
        flags.append(f"Requested rate {rate_pct:.2f}% is below BofA's risk-based price of {fair_rate:.2f}% for this profile.")
    if cap_max and amount > cap_max:
        flags.append(f"Requested amount exceeds estimated borrowing capacity of ${cap_max:,.0f}.")
    if term_years not in LOAN_TYPES[loan_type][3]:
        flags.append(f"{term_years}-year term is unusual for a {loan_type}; typical terms are "
                     f"{', '.join(map(str, LOAN_TYPES[loan_type][3]))} years.")

    return {
        "company": company,
        "requested": requested,
        "verdict": verdict,
        "flags": flags,
        "capacity": {"max_amount": cap_max, "by_term": caps, "meets_guidelines": cap_max > 0},
        "alternatives": alternatives,
        "factors": factors(company, loan, amount, rate_pct),
        "comparables": comparables(company, loan),
        "history_curve": HISTORY_CURVE,
        "request_dscr_bucket": dscr_bucket(requested["post_dscr"]),
        "risk_matrix": risk_matrix(company, loan_type, amount),
        "model": METRICS,
    }
