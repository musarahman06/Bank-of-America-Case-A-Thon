export interface Company {
  name: string
  industry: string
  years_in_business: number
  annual_revenue: number
  ebitda_margin: number
  revenue_growth: number
  current_ratio: number
  credit_score: number
  existing_debt: number
  collateral_value: number
}

export interface Preset {
  id: string
  label: string
  company: Company
  request: { loan_type: string; amount: number; term_years: number }
}

export interface Meta {
  industries: string[]
  loan_types: Record<string, { terms: number[] }>
  presets: Preset[]
  model: ModelMetrics
  ai_enabled: boolean
}

export interface ModelMetrics {
  default_auc: number
  approval_auc: number
  training_loans: number
  approved_loans: number
  historical_default_rate: number
  historical_approval_rate: number
}

export interface FundingSource {
  name: string
  group: string
  amount: number
}

export interface Funding {
  loan_amount: number
  sources: FundingSource[]
  groups: { name: string; amount: number }[]
  equity_capital_held: number
  risk_weight: number
  cet1_ratio: number
  source: string
  note: string
}

export interface Offer {
  label: string
  tagline: string
  loan_type: string
  amount: number
  term_years: number
  rate_pct: number
  monthly_payment: number
  total_interest: number
  balances: { year: number; balance: number }[]
  score: number
  score_breakdown: Record<'approval' | 'affordability' | 'cost' | 'fit' | 'safety', number>
  risk: number
  risk_label: string
  p_default: number
  p_approval: number
  post_dscr: number
  post_leverage: number
  collateral_coverage: number
  monthly_cash_flow: number
  funding: Funding
  recommended?: boolean
  score_vs_request?: number
  fair_rate_pct?: number
}

export interface Factor {
  factor: string
  value: string
  benchmark: string
  status: 'ok' | 'warn' | 'bad'
  score_gain_if_fixed: number
  default_risk_drop: number
  tip: string
}

export interface Comparables {
  count: number
  approval_rate: number
  default_rate: number
  avg_rate_pct: number
  median_amount: number
}

export interface HistoryPoint {
  bucket: string
  approval_rate: number
  default_rate: number
  loans: number
}

export interface Capacity {
  max_amount: number
  by_term: { term_years: number; max_amount: number }[]
  meets_guidelines: boolean
}

interface Common {
  company: Company
  capacity: Capacity
  factors: Factor[]
  comparables: Comparables
  history_curve: HistoryPoint[]
  model: ModelMetrics
}

export interface OffersResult extends Common {
  loan_type: string
  desired_amount: number | null
  offers: Offer[]
  best_dscr_bucket: string
  ai: {
    headline: string
    summary: string
    offers: { label: string; why: string }[]
    holding_back: string[]
    next_steps: string[]
    source: 'gemini' | 'template'
  }
}

export interface EvaluateResult extends Common {
  requested: Offer
  verdict: 'Good' | 'Caution' | 'Not Recommended'
  flags: string[]
  alternatives: Offer[]
  request_dscr_bucket: string
  ai: {
    headline: string
    verdict_explanation: string
    holding_back: string[]
    how_to_improve: string[]
    alternatives_note: string
    source: 'gemini' | 'template'
  }
}
