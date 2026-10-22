import os

# Model scoring runs on small batches; OpenMP thread spin-up costs more than it saves.
os.environ.setdefault("OMP_NUM_THREADS", "1")

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from . import engine
from .explain import explain_evaluation, explain_offers
from .features import INDUSTRIES, LOAN_TYPES
from .presets import PRESETS
from .schemas import EvaluateRequest, OfferRequest

app = FastAPI(title="BofA Loan Clarity API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/meta")
def meta():
    return {
        "industries": list(INDUSTRIES),
        "loan_types": {k: {"terms": v[3]} for k, v in LOAN_TYPES.items()},
        "presets": PRESETS,
        "model": engine.METRICS,
        "ai_enabled": bool(os.getenv("GEMINI_API_KEY")),
    }


@app.post("/api/offers")
async def offers(req: OfferRequest):
    result = await run_in_threadpool(engine.make_offers, req.company.model_dump(), req.loan_type, req.desired_amount)
    result["ai"] = await run_in_threadpool(explain_offers, result)
    return result


@app.post("/api/evaluate")
async def evaluate(req: EvaluateRequest):
    result = await run_in_threadpool(
        engine.evaluate_request, req.company.model_dump(), req.amount, req.term_years, req.loan_type, req.rate_pct
    )
    result["ai"] = await run_in_threadpool(explain_evaluation, result)
    return result
