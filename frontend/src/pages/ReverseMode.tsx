import { useState, type CSSProperties, type ReactNode } from 'react'
import { evaluateLoan } from '../api'
import { BalanceChart, CapacityChart, CashFlowChart, ComparablesChart, HistoryChart, ScoreBreakdownChart } from '../charts/Charts'
import FundingSankey from '../charts/FundingSankey'
import { RiskMeter, ScoreBadge } from '../components/Badges'
import FactorsTable from '../components/FactorsTable'
import OfferCard from '../components/OfferCard'
import { money, moneyFull, pct, REQUEST_COLOR, SERIES } from '../format'
import type { Company, EvaluateResult, Meta } from '../types'

export interface RequestDraft {
  loan_type: string
  amount: number
  term_years: number
}

interface Props {
  meta: Meta
  company: Company
  companyForm: ReactNode
  initial: RequestDraft
}

const VERDICT_COLOR = {
  Good: 'var(--status-good)',
  Caution: 'var(--status-warning)',
  'Not Recommended': 'var(--status-critical)',
}

export default function ReverseMode({ meta, company, companyForm, initial }: Props) {
  const [loanType, setLoanType] = useState(initial.loan_type)
  const [amount, setAmount] = useState(String(initial.amount / 1e6))
  const [term, setTerm] = useState(String(initial.term_years))
  const [rate, setRate] = useState('')
  const [result, setResult] = useState<EvaluateResult | null>(null)
  const [selected, setSelected] = useState(0) // 0 = request, 1-3 = alternatives
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true)
    setError('')
    try {
      const r = await evaluateLoan(company, loanType, Number(amount) * 1e6, Number(term), rate ? Number(rate) : null)
      setResult(r)
      setSelected(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const terms = meta.loan_types[loanType]?.terms ?? []
  const series = result
    ? [{ offer: result.requested, color: REQUEST_COLOR }, ...result.alternatives.map((offer, i) => ({ offer, color: SERIES[i] }))]
    : []
  const req = result?.requested

  return (
    <div className="layout">
      <aside className="card form">
        {companyForm}
        <div className="divider" />
        <h3>The loan you want</h3>
        <div className="field">
          <label htmlFor="rtype">Loan type</label>
          <select
            id="rtype"
            value={loanType}
            onChange={(e) => {
              setLoanType(e.target.value)
              setTerm(String(meta.loan_types[e.target.value].terms.at(-2) ?? meta.loan_types[e.target.value].terms[0]))
            }}
          >
            {Object.keys(meta.loan_types).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="ramt">Amount ($M)</label>
            <input id="ramt" type="number" step="0.5" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rterm">Term (years)</label>
            <input id="rterm" type="number" min="1" max="30" list="terms" value={term} onChange={(e) => setTerm(e.target.value)} />
            <datalist id="terms">
              {terms.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <span className="hint">Typical: {terms.join(', ')}</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="rrate">Rate you want (%, optional)</label>
          <input id="rrate" type="number" step="0.05" placeholder="Use BofA's risk-based price" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <button className="btn secondary" onClick={run} disabled={loading || !Number(amount) || !Number(term)}>
          {loading ? 'Evaluating…' : 'Evaluate my loan'}
        </button>
        {error && <div className="error">{error}</div>}
      </aside>

      <section className={`stack${loading ? ' loading' : ''}`}>
        {!result || !req ? (
          <div className="card empty">
            <h3>Already know what you want?</h3>
            <p>
              Enter the loan you have in mind. The AI judges it against {meta.model.training_loans.toLocaleString()} historical
              loans, shows what's holding it back, and recommends better-scoring alternatives.
            </p>
          </div>
        ) : (
          <>
            <div className="card verdict" style={{ '--vc': VERDICT_COLOR[result.verdict] } as CSSProperties}>
              <ScoreBadge score={req.score} large />
              <div>
                <span className="verdict-pill">
                  <i /> {result.verdict}
                </span>
                <h2>{result.ai.headline}</h2>
                <p>{result.ai.verdict_explanation}</p>
                {result.flags.length > 0 && (
                  <ul className="flags">
                    {result.flags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
              <RiskMeter risk={req.risk} />
            </div>

            <div className="card">
              <div className="metrics">
                <div className="metric">
                  <span>Coverage after loan</span>
                  <b>{req.post_dscr.toFixed(2)}x</b>
                  <small>BofA guideline ≥ 1.25x</small>
                </div>
                <div className="metric">
                  <span>Leverage after loan</span>
                  <b>{req.post_leverage.toFixed(1)}x</b>
                  <small>BofA guideline ≤ 4.0x</small>
                </div>
                <div className="metric">
                  <span>Approval odds</span>
                  <b>{pct(req.p_approval)}</b>
                  <small>Default risk {pct(req.p_default, 1)}</small>
                </div>
                <div className="metric">
                  <span>Rate / payment</span>
                  <b>{req.rate_pct.toFixed(2)}%</b>
                  <small>
                    {moneyFull(req.monthly_payment)}/mo · fair rate {req.fair_rate_pct?.toFixed(2)}%
                  </small>
                </div>
              </div>
            </div>

            <div className="card ai">
              <span className="ai-badge">✦ AI analysis {result.ai.source === 'gemini' ? '· Gemini' : '· model'}</span>
              <div className="ai-cols">
                <div>
                  <h4>What's holding this loan back</h4>
                  <ul>
                    {(result.ai.holding_back.length ? result.ai.holding_back : ['Nothing significant — this request fits your profile well.']).map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>How to improve</h4>
                  <ul>
                    {result.ai.how_to_improve.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p style={{ marginTop: 12 }}>{result.ai.alternatives_note}</p>
            </div>

            <h2 className="section-title">Recommended alternatives</h2>
            <div className="grid-3">
              {result.alternatives.map((a, i) => (
                <OfferCard
                  key={a.label}
                  offer={a}
                  color={SERIES[i]}
                  selected={selected === i + 1}
                  onSelect={() => setSelected(selected === i + 1 ? 0 : i + 1)}
                  compareTo={req.score}
                />
              ))}
            </div>

            <div className="grid-2">
              <BalanceChart series={series} />
              <CashFlowChart series={series} />
            </div>
            <div className="grid-2">
              <ScoreBreakdownChart series={series} />
              <CapacityChart capacity={result.capacity} marker={req.amount} markerLabel={`Your request ${money(req.amount)}`} />
            </div>

            <FundingSankey
              funding={series[selected].offer.funding}
              title={selected === 0 ? 'Your requested loan (click an alternative to compare)' : `${series[selected].offer.label} alternative`}
            />

            <div className="grid-2">
              <HistoryChart curve={result.history_curve} bucket={result.request_dscr_bucket} color={REQUEST_COLOR} />
              <ComparablesChart comps={result.comparables} offer={req} color={REQUEST_COLOR} />
            </div>

            <FactorsTable factors={result.factors} />
          </>
        )}
      </section>
    </div>
  )
}
