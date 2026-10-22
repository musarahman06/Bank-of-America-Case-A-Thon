from typing import Literal, Optional

from pydantic import BaseModel, Field

from .features import INDUSTRIES, LOAN_TYPES

Industry = Literal[tuple(INDUSTRIES)]
LoanType = Literal[tuple(LOAN_TYPES)]


class CompanyProfile(BaseModel):
    name: str = "Client Company"
    industry: Industry
    years_in_business: int = Field(ge=0, le=200)
    annual_revenue: float = Field(gt=0, description="USD")
    ebitda_margin: float = Field(ge=-0.5, le=0.9, description="decimal, e.g. 0.15")
    revenue_growth: float = Field(ge=-1, le=5, description="decimal YoY, e.g. 0.08")
    current_ratio: float = Field(gt=0, le=20)
    credit_score: int = Field(ge=300, le=850)
    existing_debt: float = Field(ge=0, description="USD")
    collateral_value: float = Field(ge=0, description="USD")


class OfferRequest(BaseModel):
    company: CompanyProfile
    loan_type: LoanType = "Term Loan"
    desired_amount: Optional[float] = Field(default=None, gt=0)
    purpose: Optional[str] = None


class EvaluateRequest(BaseModel):
    company: CompanyProfile
    loan_type: LoanType = "Term Loan"
    amount: float = Field(gt=0)
    term_years: int = Field(ge=1, le=30)
    rate_pct: Optional[float] = Field(default=None, gt=0, le=30)
    purpose: Optional[str] = None
