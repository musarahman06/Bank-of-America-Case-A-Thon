# Bank of America Case-A-Thon — Loan Clarity (Option A)

**Problem:** Mid-market businesses wait weeks for a loan decision and don't know how much they can borrow or what's holding them back.

**Solution:** An AI lending platform that answers in seconds:

- **Get Loan Offers:** enter company financials and get **3 tailored offers** (Best Match, Maximum Capacity, Lowest Cost). Each one has a **Score 1–100** (higher is better for the client) and a **Risk 1–5** (5 is riskiest).
- **Evaluate My Loan (reverse mode):** bring the loan you want, get a verdict (Good / Caution / Not Recommended), see what's holding it back, and get 3 recommended alternatives.
- **Where the money comes from:** a Sankey diagram showing how each loan is funded across BofA's balance sheet (deposits by business segment, long-term debt, shareholders' equity). It also shows how much capital BofA must hold against the loan's risk.
- **Graphs:** balance paydown, cash flow used by debt, score breakdown, borrowing capacity by term, historical default rates by coverage, and comparison with similar past loans.

## How it works

| Layer | What it does |
|---|---|
| `backend/data/generate_data.py` | Seeded synthetic history of 6,000 mid-market loans standing in for BofA's internal loan book (not public). Outcomes are driven by real credit drivers. |
| `backend/ml/train.py` | Two gradient-boosted models (scikit-learn), monotonic-constrained for explainability: **P(default)** (AUC ≈ 0.83) and **P(approval)** (AUC ≈ 0.92). |
| `backend/app/engine.py` | Risk-based pricing, borrowing capacity (DSCR ≥ 1.25x, Debt/EBITDA ≤ 4.0x), candidate grid search, scoring, offer selection, what-if factor analysis, nearest-neighbor comparables. |
| `backend/app/funding.py` | BofA funding mix from the 4Q25 investor presentation (Dec 31, 2025). Capital held = amount × risk weight × 11.4% CET1. |
| `backend/app/explain.py` | Google **Gemini** writes plain-English explanations. Falls back to templated text if no key is set or the call fails. |
| `frontend/` | React + Vite + TypeScript + Recharts. |

**Score (1–100)** = 30% approval odds + 25% affordability (post-loan DSCR) + 20% cost (APR) + 15% fit to the amount needed + 10% low risk.
**Risk (1–5)** buckets the predicted default probability: <2%, 2–5%, 5–10%, 10–20%, >20%.

## Run it

```bash
# Backend (Python 3.12+)
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env          # optional: add GEMINI_API_KEY for AI explanations
.venv/bin/python -m data.generate_data
.venv/bin/python -m ml.train
.venv/bin/uvicorn app.main:app --port 8000
```

```bash
# Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :8000)
```

## Demo script

1. **Get Loan Offers** → load *Precision Parts Co.*: strong profile, scores in the 90s, risk 1.
2. Load *Harbor Home Goods* (leveraged retailer): lower scores, risk 3–4, and the "holding you back" table shows margin and leverage as the problems.
3. **Evaluate My Loan** with Harbor's $30M request: **Not Recommended** (score ~22, risk 5). The alternatives score about 40 points higher.
4. Click different offer cards to watch the funding Sankey re-allocate. Riskier loans tie up more BofA capital.

*Data is synthetic and the funding allocation is illustrative. This is a case-competition prototype, not a credit decision.*
