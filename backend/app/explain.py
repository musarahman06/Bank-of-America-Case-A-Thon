"""Plain-English explanations from Gemini, with a templated fallback so the demo never breaks."""
import json
import logging
import os

log = logging.getLogger(__name__)

_client = None


def _gemini():
    global _client
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    if _client is None:
        from google import genai
        from google.genai import types

        _client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=25_000))
    return _client


SYSTEM = (
    "You are a Bank of America commercial lending advisor explaining AI-generated loan analysis "
    "to the CFO of a mid-market company. Be clear, specific and encouraging but honest. Use the numbers "
    "provided, never invent figures. Scores are 1-100 (higher is better for the client); risk is 1-5 "
    "(5 is riskiest). Keep each field to 1-3 short sentences. Respond with JSON only."
)


def _money(x):
    return f"${x / 1e6:,.1f}M" if x >= 1e6 else f"${x:,.0f}"


def _slim_offer(o):
    keys = ["label", "loan_type", "amount", "term_years", "rate_pct", "monthly_payment", "total_interest",
            "score", "risk", "risk_label", "p_approval", "p_default", "post_dscr", "post_leverage"]
    return {k: o[k] for k in keys}


def _ask(payload, schema_hint):
    client = _gemini()
    if client is None:
        return None
    from google.genai import types

    prompt = f"{schema_hint}\n\nData:\n{json.dumps(payload, default=str)}"
    try:
        resp = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM, response_mime_type="application/json", temperature=0.4
            ),
        )
        return json.loads(resp.text)
    except Exception as e:  # network, quota, bad JSON: fall back to templates
        log.warning("Gemini call failed, using template: %s", e)
        return None


def explain_offers(result):
    issues = [f for f in result["factors"] if f["status"] != "ok"]
    payload = {
        "company": result["company"],
        "capacity": result["capacity"]["max_amount"],
        "offers": [_slim_offer(o) for o in result["offers"]],
        "issues": issues,
        "similar_historical_loans": result["comparables"],
    }
    hint = (
        'Return JSON: {"headline": str, "summary": str, '
        '"offers": [{"label": str, "why": str}] (one per offer, same labels and order), '
        '"holding_back": [str] (0-3 items, empty if nothing), "next_steps": [str] (2-3 items)}'
    )
    ai = _ask(payload, hint)
    if ai:
        return {**ai, "source": "gemini"}

    best = max(result["offers"], key=lambda o: o["score"])
    return {
        "headline": f"{result['company']['name']} can borrow up to {_money(result['capacity']['max_amount'])} "
                    f"within BofA guidelines." if result["capacity"]["max_amount"] else
                    f"{result['company']['name']} does not currently meet BofA's coverage guidelines.",
        "summary": f"Our top pick is the {best['label']}: {_money(best['amount'])} over {best['term_years']} years "
                   f"at {best['rate_pct']:.2f}%, scoring {best['score']}/100 with risk {best['risk']}/5. "
                   f"Similar historical loans were approved {result['comparables']['approval_rate']:.0%} of the time.",
        "offers": [{"label": o["label"], "why": f"{o['tagline']}. Coverage after the loan would be "
                    f"{o['post_dscr']:.2f}x, with an estimated {o['p_approval']:.0%} approval likelihood."}
                   for o in result["offers"]],
        "holding_back": [f"{f['factor']} is {f['value']} (target {f['benchmark']}). {f['tip']}" for f in issues[:3]],
        "next_steps": ["Upload the last 3 years of financial statements to confirm these figures.",
                       "Talk with your BofA relationship manager to lock in the offer you prefer."],
        "source": "template",
    }


def explain_evaluation(result):
    req = result["requested"]
    issues = [f for f in result["factors"] if f["status"] != "ok"]
    payload = {
        "company": result["company"],
        "requested_loan": {**_slim_offer(req), "bofa_risk_based_rate": req["fair_rate_pct"]},
        "verdict": result["verdict"],
        "flags": result["flags"],
        "capacity": result["capacity"]["max_amount"],
        "issues": issues,
        "alternatives": [_slim_offer(a) for a in result["alternatives"]],
        "similar_historical_loans": result["comparables"],
    }
    hint = (
        'Return JSON: {"headline": str, "verdict_explanation": str, '
        '"holding_back": [str] (0-4 items), "how_to_improve": [str] (2-3 items), '
        '"alternatives_note": str (why the recommended alternatives may be better)}'
    )
    ai = _ask(payload, hint)
    if ai:
        return {**ai, "source": "gemini"}

    best = max(result["alternatives"], key=lambda o: o["score"])
    return {
        "headline": f"{result['verdict']}: your {_money(req['amount'])} {req['loan_type'].lower()} scores "
                    f"{req['score']}/100 with risk {req['risk']}/5.",
        "verdict_explanation": f"After this loan your debt service coverage would be {req['post_dscr']:.2f}x and "
                               f"leverage {req['post_leverage']:.1f}x, with an estimated {req['p_approval']:.0%} "
                               f"approval likelihood and {req['p_default']:.1%} default probability.",
        "holding_back": result["flags"] + [f"{f['factor']} is {f['value']} (target {f['benchmark']})."
                                           for f in issues[:3]],
        "how_to_improve": [f["tip"] for f in issues if f["tip"]][:3] or
                          ["Your profile is strong; consider negotiating on rate or fees."],
        "alternatives_note": f"The {best['label']} ({_money(best['amount'])}, {best['term_years']} yrs) scores "
                             f"{best['score']}/100{' — higher than your request' if best['score'] > req['score'] else ''}.",
        "source": "template",
    }
