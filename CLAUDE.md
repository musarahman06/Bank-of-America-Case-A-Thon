# CLAUDE.md

## Project
Bank of America Case-A-Thon entry, **Option A: "Getting faster, clearer answers on loans."** It's a demo web app for mid-market businesses with two modes:

1. **Get Loan Offers**: the user enters company financials and gets **3 loan offers** (Maximum Capacity, Balanced, Lowest Cost). Each offer has a **Score 1–100** (higher is better for the client) and a **Risk 1–5** (5 is riskiest), with graphs.
2. **Evaluate My Loan** (reverse mode): the client describes the loan they want. The model gives a verdict (Good ≥75 / Caution 50–74 / Not recommended <50), the graphs, and "what's holding you back", then recommends 3 alternatives.

Every offer and evaluation also includes a **"where the money comes from" Sankey chart**. It splits the loan across BoA's funding sources: deposits by segment, long-term debt, short-term borrowings and equity. It also shows how much equity capital BoA must hold against the loan, which grows with the loan's risk tier.

The full plan is in `/Users/musarahman/.claude/plans/we-are-doing-a-validated-sun.md`.

## Stack and layout
```
backend/   Python 3.14, FastAPI, scikit-learn, google-genai (venv at backend/.venv)
  data/generate_data.py   seeded synthetic ~5,000 historical mid-market loans -> data/loans.csv
  ml/train.py             GradientBoosting default + approval models -> ml/artifacts/*.joblib
  app/main.py             FastAPI routes: POST /api/offers, POST /api/evaluate, GET /api/presets
  app/schemas.py          Pydantic models (CompanyProfile, LoanRequest, LoanOffer, Evaluation)
  app/engine.py           capacity, pricing, scoring, risk tiers, amortization, comparables
  app/explain.py          Gemini explanations, with templated fallback text
  app/funding.py          BoA funding-source breakdown per loan
frontend/  React + Vite + TypeScript + Recharts (Vite proxies /api -> :8000)
```

## Commands
```bash
# one app: FastAPI serves /api and the built frontend at /
python3 -m venv .venv && .venv/bin/pip install -e .   # deps live in pyproject.toml
.venv/bin/python build.py                             # data -> models -> frontend/dist
.venv/bin/uvicorn backend.app.main:app                # :8000

# UI hot reload (proxies /api -> :8000)
cd frontend && npm run dev                            # :5173
```
Deploy: a single Vercel project at the repo root (`pyproject.toml` entrypoint + `build.py`, `vercel.json` function config).

## Conventions and rules
- **The data is synthetic.** BoA's internal loan history isn't public. Never present the generated loans as real BoA data. Keep the generator seeded so demo numbers are reproducible.
- **The AI provider is Gemini, not Claude.** Use the `google-genai` SDK. The key is `GEMINI_API_KEY` and the model is `GEMINI_MODEL`, both set in `backend/.env` (gitignored, with `.env.example` committed). If the key is missing or the call fails, show the templated text instead. The demo must never break.
- **Audiences:** one engine, two views (`frontend/src/hooks/useView.tsx`). The **Client view** (default) is the borrower portal: it never shows default probability, the 1–5 risk tier, comparables' default rates, the risk heat matrix or the funding/capital Sankey; risk appears only as a loan-health label (`healthLabel` in `format.ts`: Strong fit / Moderate fit / Stretch / Hard to approve). The **Banker view** (relationship manager) adds all of those plus the Credit view card. Gemini/template text is always client-safe (no default probability, risk tiers or BofA funding). The switch is a demo control; production would gate Banker view behind BofA sign-in and strip internal fields server-side.
- The numbers (scores, risk, rates, capacity) come only from the ML models and `engine.py`. Gemini only explains them in plain English and must never invent figures.
- Scoring weights: approval likelihood 30%, post-loan DSCR affordability 25%, cost/APR 20%, fit to the requested amount 15%, inverse risk 10%. Clip the result to 1–100.
- Risk tiers by P(default): <2% → 1, 2–5% → 2, 5–10% → 3, 10–20% → 4, >20% → 5.
- The funding figures come from BoA's latest public 10-K or quarterly report. Store the source and period alongside them, and label the chart "Illustrative".
- Styling: light-only BofA Executive Fintech theme (see "UI & Aesthetic Rules" below). Built with Tailwind v4; theme tokens live in the `@theme` block of `frontend/src/index.css`. Reference designs are in `design-refs/`.
- Charts: offer series `#2563eb` / `#e31837` / `#0d9488`, "Your Request" `#d97706` (validated with the dataviz palette checker on white); gauges use navy `#012169`. Risk uses status colors green/amber/orange/red. Keep legends and direct labels so color is never the only cue. Charts must be readable at phone width.
- UI primitives live in `frontend/src/ui/` (Card, Slider, PillGroup, StepCard/Stepper, Dropzone, Badge, Stat, RadialGauge); reuse them instead of native inputs. Live re-scoring calls the API with `explain: false` (no Gemini); only the explicit "full analysis" button requests AI text.
- The landing page (`frontend/src/pages/Landing.tsx`) borrows moto-card.com's layout and motion style only. Never copy that site's text, logo or images.
- Keep `backend/requirements.txt` in sync with `pyproject.toml` dependencies.
- Never commit secrets, `.venv/`, `node_modules/` or `ml/artifacts/` (artifacts are regenerated by `train.py`).

## Verification
- `train.py` should print AUCs of about 0.75 or higher.
- Test both endpoints with each preset:
  - A healthy company should get a high top score and risk 1–2.
  - A leveraged company should get lower scores and risk 4–5.
  - An oversized request in reverse mode should get "Not recommended", with blockers and smaller alternatives.
- In the funding Sankey, the parts must add up to the loan amount. A risk-5 loan must show more equity capital held than a risk-1 loan.

## UI & Aesthetic Rules (BofA Executive Fintech Theme)
- **Color Palette**: 
  - App Background: `#F8FAFC` (`bg-slate-50`) — NEVER use pure white `#FFFFFF` as the page background.
  - Card Surface: `#FFFFFF` (`bg-white`) with `border border-slate-200 rounded-xl shadow-sm`.
  - Primary Brand Navy: `#012169` (Headers, active pills, primary gauges/charts).
  - Primary Brand Crimson: `#E31837` (Primary CTA buttons, critical bottleneck highlights, negative deltas).
- **Typography**:
  - Primary UI/Headings: `'Plus Jakarta Sans'` or `'Inter'`, tight tracking (`tracking-tight`).
  - Financial Metrics & Scores: `'JetBrains Mono'` with `tabular-nums` so numbers align vertically.
- **Component Standards**:
  - Avoid default HTML `<select>`, `<input type="number">`, or unstyled tables.
  - Use interactive range sliders with live value badges, segmented pill selectors, and soft horizontal table dividers (`divide-y divide-slate-100`).
  - Keep all existing React state, props, and calculation math intact when refactoring UI.
