import { ArrowDown, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { evaluateLoan } from '../api'
import { BalanceChart, CapacityChart, CashFlowChart, ComparablesChart, HistoryChart, ScoreBreakdownChart } from '../charts/Charts'
import FundingSankey from '../charts/FundingSankey'
import ScoreRadar from '../charts/ScoreRadar'
import { HealthBadge, RiskMeter } from '../components/Badges'
import CreditView from '../components/CreditView'
import FactorsTable from '../components/FactorsTable'
import KpiRow from '../components/KpiRow'
import OfferCard from '../components/OfferCard'
import RiskHeatMatrix from '../components/RiskHeatMatrix'
import ScenarioCompare from '../components/ScenarioCompare'
import { money, moneyFull, pct, REQUEST_COLOR, SERIES } from '../format'
import { useDebounced } from '../hooks/useDebounced'
import { useIsBanker } from '../hooks/useView'
import type { Company, EvaluateResult, Meta } from '../types'
import Badge, { type Tone } from '../ui/Badge'
import Card from '../ui/Card'
import PillGroup from '../ui/PillGroup'
import RadialGauge from '../ui/RadialGauge'
import Slider from '../ui/Slider'
import StepCard, { Stepper } from '../ui/StepCard'

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

const VERDICT_TONE: Record<EvaluateResult['verdict'], Tone> = {
  Good: 'good',
  Caution: 'warn',
  'Not Recommended': 'critical',
}

const STEPS = ['Company profile', 'The loan you want', 'Review & analyze']

export default function ReverseMode({ meta, company, companyForm, initial }: Props) {
  const [loanType, setLoanType] = useState(initial.loan_type)
  const [amount, setAmount] = useState(String(initial.amount / 1e6))
  const [term, setTerm] = useState(String(initial.term_years))
  const [rate, setRate] = useState('')
  const [result, setResult] = useState<EvaluateResult | null>(null)
  const [selected, setSelected] = useState(0) // 0 = request, 1-3 = alternatives
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Live scorecard: numbers-only re-scoring as inputs change (no Gemini call).
  const [live, setLive] = useState<EvaluateResult | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [openStep, setOpenStep] = useState(1)
  const liveSeq = useRef(0)
  const banker = useIsBanker()

  // Debounce a stable string key: a fresh object each render would never settle.
  const inputsKey = useDebounced(JSON.stringify({ company, loanType, amount, term, rate }), 350)

  useEffect(() => {
    const inputs = JSON.parse(inputsKey) as { company: Company; loanType: string; amount: string; term: string; rate: string }
    const amt = Number(inputs.amount) * 1e6
    const t = Number(inputs.term)
    if (!amt || !t) return
    const seq = ++liveSeq.current
    setLiveLoading(true)
    evaluateLoan(inputs.company, inputs.loanType, amt, t, inputs.rate ? Number(inputs.rate) : null, false)
      .then((r) => seq === liveSeq.current && setLive(r))
      .catch(() => {})
      .finally(() => seq === liveSeq.current && setLiveLoading(false))
  }, [inputsKey])

  async function run() {
    setLoading(true)
    setError('')
    try {
      const r = await evaluateLoan(company, loanType, Number(amount) * 1e6, Number(term), rate ? Number(rate) : null)
      setResult(r)
      setLive(r)
      setSelected(0)
      setTimeout(() => document.getElementById('eval-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const terms = meta.loan_types[loanType]?.terms ?? []
  const termOptions = [...new Set([...terms, Number(term)].filter(Boolean))].sort((a, b) => a - b)
  const amountMax = Math.max(5, (company.annual_revenue * 0.6) / 1e6, Number(amount) * 1.5)
  const series = result
    ? [{ offer: result.requested, color: REQUEST_COLOR }, ...result.alternatives.map((offer, i) => ({ offer, color: SERIES[i] }))]
    : []
  const req = result?.requested
  const lr = live?.requested
  const bestAlt = result ? [...result.alternatives].sort((a, b) => b.score - a.score)[0] : undefined

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ---------- inputs (7 cols) ---------- */}
        <div className="space-y-4 lg:col-span-7">
          <Stepper steps={STEPS} active={openStep} onSelect={setOpenStep} />

          <StepCard n={1} title="Company profile" sub={`${company.name} · ${company.industry} · ${money(company.annual_revenue)} revenue`} open={openStep === 0} done onToggle={() => setOpenStep(openStep === 0 ? -1 : 0)}>
            {companyForm}
          </StepCard>

          <StepCard
            n={2}
            title="The loan you want"
            sub={`${loanType} · ${money(Number(amount) * 1e6)} · ${term} yrs · ${rate ? `${Number(rate).toFixed(2)}%` : 'BofA price'}`}
            open={openStep === 1}
            done={openStep > 1}
            onToggle={() => setOpenStep(openStep === 1 ? -1 : 1)}
            tag={<Badge tone="info">Live</Badge>}
          >
            <div className="space-y-6">
              <PillGroup
                label="Loan type"
                options={Object.keys(meta.loan_types).map((t) => ({ value: t, label: t }))}
                value={loanType}
                onChange={(t) => {
                  setLoanType(t)
                  setTerm(String(meta.loan_types[t].terms.at(-2) ?? meta.loan_types[t].terms[0]))
                }}
              />
              <Slider label="Amount" value={Number(amount)} min={0.25} max={amountMax} step={0.25} scale="log" format={(v) => money(v * 1e6)} onChange={(v) => setAmount(String(v))} />
              <PillGroup
                label={`Term (typical for ${loanType.toLowerCase()}: ${terms.join(', ')} yrs)`}
                options={termOptions.map((t) => ({ value: t, label: `${t} yr${t > 1 ? 's' : ''}` }))}
                value={Number(term)}
                onChange={(t) => setTerm(String(t))}
              />
              <div className="space-y-3">
                <PillGroup
                  label="Interest rate"
                  size="sm"
                  options={[
                    { value: 'bofa', label: "Use BofA's risk-based price" },
                    { value: 'mine', label: 'I have a rate in mind' },
                  ]}
                  value={rate ? 'mine' : 'bofa'}
                  onChange={(v) => setRate(v === 'mine' ? String(lr?.fair_rate_pct ?? 7) : '')}
                />
                {rate && <Slider label="Rate you want" value={Number(rate)} min={3} max={18} step={0.05} format={(v) => `${v.toFixed(2)}%`} onChange={(v) => setRate(v.toFixed(2))} />}
              </div>
              <button type="button" onClick={() => setOpenStep(2)} className="text-sm font-semibold text-navy hover:underline">
                Continue to review →
              </button>
            </div>
          </StepCard>

          <StepCard n={3} title="Review & analyze" sub="Run the full analysis for AI explanations and alternatives" open={openStep === 2} onToggle={() => setOpenStep(openStep === 2 ? -1 : 2)}>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-100 bg-slate-100 text-sm sm:grid-cols-4">
              {[
                ['Company', company.name],
                ['Loan', `${loanType}`],
                ['Amount / term', `${money(Number(amount) * 1e6)} · ${term} yrs`],
                ['Rate', rate ? `${Number(rate).toFixed(2)}%` : lr ? `${lr.rate_pct.toFixed(2)}% (BofA)` : 'BofA price'],
              ].map(([k, v]) => (
                <div key={k} className="bg-white px-3 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                  <dd className="truncate font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={run}
              disabled={loading || !Number(amount) || !Number(term)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-crimson-600 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Analyzing…' : 'Run full AI analysis'}
            </button>
            {error && <p className="mt-2 text-sm text-crimson">{error}</p>}
          </StepCard>
        </div>

        {/* ---------- live scorecard (5 cols, sticky) ---------- */}
        <aside className="lg:col-span-5">
          <div className="space-y-4 lg:sticky lg:top-24">
            <Card
              title="Live scorecard"
              sub="Updates as you change the inputs"
              action={liveLoading ? <Loader2 size={16} className="animate-spin text-slate-400" /> : live && <Badge tone={VERDICT_TONE[live.verdict]} dot>{live.verdict}</Badge>}
            >
              {lr && live ? (
                <div className={`transition-opacity ${liveLoading ? 'opacity-60' : ''}`}>
                  <RadialGauge value={lr.score} inner={lr.p_approval * 100} label="score / 100" size={190} />
                  <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><i className="h-2 w-3 rounded-sm bg-navy" /> Score</span>
                    <span className="inline-flex items-center gap-1.5"><i className="h-2 w-3 rounded-sm bg-crimson" /> Approval odds {pct(lr.p_approval)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                    {banker && <RiskMeter risk={lr.risk} />}
                    <HealthBadge risk={lr.risk} />
                  </div>
                  <ScoreRadar offer={lr} height={220} />
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {[
                      ['Coverage after loan', `${lr.post_dscr.toFixed(2)}x`, lr.post_dscr >= 1.25 ? 'good' : 'critical', '≥ 1.25x'],
                      ['Leverage after loan', `${lr.post_leverage.toFixed(1)}x`, lr.post_leverage <= 4 ? 'good' : 'critical', '≤ 4.0x'],
                      ['Monthly payment', moneyFull(lr.monthly_payment), 'neutral', `${lr.rate_pct.toFixed(2)}%`],
                      ...(banker ? [['Default probability', pct(lr.p_default, 1), lr.risk <= 2 ? 'good' : lr.risk === 3 ? 'warn' : 'critical', `risk ${lr.risk}/5`]] : []),
                    ].map(([k, v, tone, note]) => (
                      <div key={k} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="text-[13px] text-slate-600">{k}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold tabular-nums text-slate-900">{v}</span>
                          <Badge tone={tone as Tone}>{note}</Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                  {live.flags.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {live.flags.map((f) => (
                        <li key={f} className="rounded-lg border-l-[3px] border-crimson bg-crimson-50 px-3 py-2 text-xs text-crimson-600">
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="grid h-64 place-items-center text-sm text-slate-400">
                  <Loader2 className="animate-spin" />
                </div>
              )}
              <div className="mt-5 grid gap-2">
                <button
                  onClick={run}
                  disabled={loading || !Number(amount) || !Number(term)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-crimson-600 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {loading ? 'Analyzing…' : 'Get full AI analysis'}
                </button>
                <button
                  onClick={() => (result ? document.getElementById('alternatives')?.scrollIntoView({ behavior: 'smooth' }) : run())}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-navy transition hover:border-navy"
                >
                  <ArrowDown size={15} /> See better alternatives
                </button>
              </div>
            </Card>
          </div>
        </aside>
      </div>

      {/* ---------- full results ---------- */}
      {result && req && (
        <div id="eval-results" className={`scroll-mt-24 space-y-6 ${loading ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Full analysis</h2>
            <Badge tone={VERDICT_TONE[result.verdict]} dot>{result.verdict}</Badge>
          </div>

          <KpiRow offer={req} />

          {result.ai && (
            <Card
              title={result.ai.headline}
              action={<Badge tone="info"><Sparkles size={12} /> {result.ai.source === 'gemini' ? 'Gemini' : 'Model'}</Badge>}
              className="border-l-4 border-l-navy"
            >
              <p className="text-[15px] text-slate-600">{result.ai.verdict_explanation}</p>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">What's holding this loan back</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {(result.ai.holding_back.length ? result.ai.holding_back : ['Nothing significant — this request fits your profile well.']).map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">How to improve</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {result.ai.how_to_improve.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{result.ai.alternatives_note}</p>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {bestAlt && <ScenarioCompare a={req} b={bestAlt} aTitle="Your request" bTitle={bestAlt.label} />}
            {banker && <CreditView offer={req} comps={result.comparables} flags={result.flags} />}
          </div>

          {banker && <RiskHeatMatrix matrix={result.risk_matrix} highlight={{ amount: req.amount, term_years: req.term_years }} />}

          <div id="alternatives" className="scroll-mt-24">
            <h3 className="mb-3 text-lg font-bold text-slate-900">Recommended alternatives</h3>
            <div className="grid gap-4 md:grid-cols-3">
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
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BalanceChart series={series} />
            <CashFlowChart series={series} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreBreakdownChart series={series} />
            <CapacityChart capacity={result.capacity} marker={req.amount} markerLabel={`Your request ${money(req.amount)}`} />
          </div>

          {banker && (
            <>
              <FundingSankey
                funding={series[selected].offer.funding}
                title={selected === 0 ? 'Requested loan (click an alternative to compare)' : `${series[selected].offer.label} alternative`}
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <HistoryChart curve={result.history_curve} bucket={result.request_dscr_bucket} color={REQUEST_COLOR} />
                <ComparablesChart comps={result.comparables} offer={req} color={REQUEST_COLOR} />
              </div>
            </>
          )}

          <FactorsTable factors={result.factors} />
        </div>
      )}
    </div>
  )
}
