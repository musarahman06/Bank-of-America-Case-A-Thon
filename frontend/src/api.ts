import type { Company, EvaluateResult, Meta, OffersResult } from './types'

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Request failed (${res.status}): ${detail.slice(0, 300)}`)
  }
  return res.json()
}

export const getMeta = () => call<Meta>('/meta')

export const getOffers = (company: Company, loan_type: string, desired_amount: number | null) =>
  call<OffersResult>('/offers', { company, loan_type, desired_amount })

export const evaluateLoan = (
  company: Company,
  loan_type: string,
  amount: number,
  term_years: number,
  rate_pct: number | null,
) => call<EvaluateResult>('/evaluate', { company, loan_type, amount, term_years, rate_pct })
