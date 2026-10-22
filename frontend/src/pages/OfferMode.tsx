import { useState, type ReactNode } from 'react'
import { getOffers } from '../api'
import { BalanceChart, CapacityChart, CashFlowChart, ComparablesChart, HistoryChart, ScoreBreakdownChart } from '../charts/Charts'
import FundingSankey from '../charts/FundingSankey'
import FactorsTable from '../components/FactorsTable'
import OfferCard from '../components/OfferCard'
import { money, SERIES } from '../format'
import type { Company, Meta, OffersResult } from '../types'

interface Props {
  meta: Meta
  company: Company
  companyForm: ReactNode
}

export default function OfferMode({ meta, company, companyForm }: Props) {
  const [loanType, setLoanType] = useState('Term Loan')
  const [desired, setDesired] = useState('')
  const [result, setResult] = useState<OffersResult | null>(null)
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true)
    setError('')
    try {
      const r = await getOffers(company, loanType, desired ? Number(desired) * 1e6 : null)
      setResult(r)
      setSelected(Math.max(0, r.offers.findIndex((o) => o.recommended)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const series = result?.offers.map((offer, i) => ({ offer, color: SERIES[i] })) ?? []
  const sel = series[selected]

  return (
    <div className="layout">
      <aside className="card form">
        {companyForm}
        <div className="divider" />
        <h3>What are you looking for?</h3>
        <div className="field">
          <label htmlFor="ltype">Loan type</label>
          <select id="ltype" value={loanType} onChange={(e) => setLoanType(e.target.value)}>
            {Object.keys(meta.loan_types).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="desired">Amount needed ($M, optional)</label>
          <input id="desired" type="number" step="0.5" min="0" placeholder="Let the AI decide" value={desired} onChange={(e) => setDesired(e.target.value)} />
        </div>
        <button className="btn" onClick={run} disabled={loading}>
          {loading ? 'Analyzing…' : 'Get my 3 loan offers'}
        </button>
        {error && <div className="error">{error}</div>}
      </aside>

      <section className={`stack${loading ? ' loading' : ''}`}>
        {!result ? (
          <div className="card empty">
            <h3>Instant, data-driven loan offers</h3>
            <p>
              Load a demo company or enter your financials, then click <b>Get my 3 loan offers</b>. Our model, trained on{' '}
              {meta.model.training_loans.toLocaleString()} historical mid-market loans, finds three options, each scored 1–100 and
              rated for risk 1–5.
            </p>
          </div>
        ) : (
          <>
            <div className="card ai">
              <span className="ai-badge">✦ AI summary {result.ai.source === 'gemini' ? '· Gemini' : '· model'}</span>
              <h2>{result.ai.headline}</h2>
              <p>{result.ai.summary}</p>
              <div className="ai-cols">
                {result.ai.holding_back.length > 0 && (
                  <div>
                    <h4>What might hold you back</h4>
                    <ul>
                      {result.ai.holding_back.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h4>Next steps</h4>
                  <ul>
                    {result.ai.next_steps.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid-3">
              {series.map((s, i) => (
                <OfferCard
                  key={s.offer.label}
                  offer={s.offer}
                  color={s.color}
                  selected={i === selected}
                  onSelect={() => setSelected(i)}
                  why={result.ai.offers.find((o) => o.label === s.offer.label)?.why}
                />
              ))}
            </div>

            <div className="grid-2">
              <BalanceChart series={series} />
              <CashFlowChart series={series} />
            </div>
            <div className="grid-2">
              <ScoreBreakdownChart series={series} />
              <CapacityChart capacity={result.capacity} marker={result.desired_amount ?? undefined} markerLabel="You need" />
            </div>

            {sel && <FundingSankey funding={sel.offer.funding} title={`${sel.offer.label} offer (click a card to switch)`} />}

            <div className="grid-2">
              {sel && <HistoryChart curve={result.history_curve} bucket={result.best_dscr_bucket} color={SERIES[result.offers.findIndex((o) => o.recommended)]} />}
              {sel && <ComparablesChart comps={result.comparables} offer={result.offers.find((o) => o.recommended)!} color={SERIES[result.offers.findIndex((o) => o.recommended)]} />}
            </div>

            <FactorsTable factors={result.factors} />

            <div className="model-strip">
              <span>Default model AUC {result.model.default_auc}</span>
              <span>Approval model AUC {result.model.approval_auc}</span>
              <span>Trained on {result.model.training_loans.toLocaleString()} historical loans</span>
              <span>Borrowing capacity {money(result.capacity.max_amount)}</span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
