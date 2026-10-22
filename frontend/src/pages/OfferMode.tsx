import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getOffers } from '../api'
import { BalanceChart, CapacityChart, CashFlowChart, ComparablesChart, HistoryChart, ScoreBreakdownChart } from '../charts/Charts'
import FundingSankey from '../charts/FundingSankey'
import ScoreRadar from '../charts/ScoreRadar'
import FactorsTable from '../components/FactorsTable'
import KpiRow from '../components/KpiRow'
import OfferCard from '../components/OfferCard'
import RiskHeatMatrix from '../components/RiskHeatMatrix'
import ScenarioCompare from '../components/ScenarioCompare'
import { money, SERIES } from '../format'
import { useDebounced } from '../hooks/useDebounced'
import type { Company, Meta, OffersResult } from '../types'
import Badge, { riskTone } from '../ui/Badge'
import Card from '../ui/Card'
import PillGroup from '../ui/PillGroup'
import RadialGauge from '../ui/RadialGauge'
import Slider from '../ui/Slider'
import StepCard, { Stepper } from '../ui/StepCard'

interface Props {
  meta: Meta
  company: Company
  companyForm: ReactNode
}

// Offer card header colors: darker steps of the chart series (blue / crimson / teal) so cards match chart lines.
const HEADS = ['#1e40af', '#e31837', '#0f766e']
const STEPS = ['Company profile', 'What you need', 'Get offers']

export default function OfferMode({ meta, company, companyForm }: Props) {
  const [loanType, setLoanType] = useState('Term Loan')
  const [desired, setDesired] = useState('')
  const [result, setResult] = useState<OffersResult | null>(null)
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Live preview for the sticky panel: numbers only, no Gemini.
  const [live, setLive] = useState<OffersResult | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [openStep, setOpenStep] = useState(1)
  const liveSeq = useRef(0)

  // Debounce a stable string key: a fresh object each render would never settle.
  const inputsKey = useDebounced(JSON.stringify({ company, loanType, desired }), 400)

  useEffect(() => {
    const inputs = JSON.parse(inputsKey) as { company: Company; loanType: string; desired: string }
    const seq = ++liveSeq.current
    setLiveLoading(true)
    getOffers(inputs.company, inputs.loanType, inputs.desired ? Number(inputs.desired) * 1e6 : null, false)
      .then((r) => seq === liveSeq.current && setLive(r))
      .catch(() => {})
      .finally(() => seq === liveSeq.current && setLiveLoading(false))
  }, [inputsKey])

  async function run() {
    setLoading(true)
    setError('')
    try {
      const r = await getOffers(company, loanType, desired ? Number(desired) * 1e6 : null)
      setResult(r)
      setLive(r)
      setSelected(Math.max(0, r.offers.findIndex((o) => o.recommended)))
      setTimeout(() => document.getElementById('offer-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const series = result?.offers.map((offer, i) => ({ offer, color: SERIES[i] })) ?? []
  const sel = series[selected]
  const best = result?.offers.find((o) => o.recommended)
  const bestIdx = result ? result.offers.findIndex((o) => o.recommended) : 0
  const liveBest = live?.offers.find((o) => o.recommended)
  const desiredMax = Math.max(5, (company.annual_revenue * 0.6) / 1e6, Number(desired || 0) * 1.5)
  const other = result?.offers.filter((o) => !o.recommended).sort((a, b) => b.score - a.score)[0]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Stepper steps={STEPS} active={openStep} onSelect={setOpenStep} />

          <StepCard n={1} title="Company profile" sub={`${company.name} · ${company.industry} · ${money(company.annual_revenue)} revenue`} open={openStep === 0} done onToggle={() => setOpenStep(openStep === 0 ? -1 : 0)}>
            {companyForm}
          </StepCard>

          <StepCard
            n={2}
            title="What are you looking for?"
            sub={`${loanType} · ${desired ? money(Number(desired) * 1e6) : 'amount: let the AI decide'}`}
            open={openStep === 1}
            done={openStep > 1}
            onToggle={() => setOpenStep(openStep === 1 ? -1 : 1)}
            tag={<Badge tone="info">Live</Badge>}
          >
            <div className="space-y-6">
              <PillGroup label="Loan type" options={Object.keys(meta.loan_types).map((t) => ({ value: t, label: t }))} value={loanType} onChange={setLoanType} />
              <div className="space-y-3">
                <PillGroup
                  label="Amount needed"
                  size="sm"
                  options={[
                    { value: 'auto', label: 'Let the AI decide' },
                    { value: 'set', label: 'I need a specific amount' },
                  ]}
                  value={desired ? 'set' : 'auto'}
                  onChange={(v) => setDesired(v === 'set' ? String(Math.max(1, Math.round((liveBest?.amount ?? 5e6) / 1e6))) : '')}
                />
                {desired && (
                  <Slider label="Amount" value={Number(desired)} min={0.25} max={desiredMax} step={0.25} scale="log" format={(v) => money(v * 1e6)} onChange={(v) => setDesired(String(v))} />
                )}
              </div>
              <button type="button" onClick={() => setOpenStep(2)} className="text-sm font-semibold text-navy hover:underline">
                Continue →
              </button>
            </div>
          </StepCard>

          <StepCard n={3} title="Get your 3 offers" sub="Scored 1–100 and risk-rated 1–5, with AI explanations" open={openStep === 2} onToggle={() => setOpenStep(openStep === 2 ? -1 : 2)}>
            <p className="text-sm text-slate-600">
              The model compares your profile with {meta.model.training_loans.toLocaleString()} historical loans and returns Best Match, Maximum Capacity and Lowest Cost options.
            </p>
            <button
              onClick={run}
              disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-crimson-600 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Analyzing…' : 'Get my 3 loan offers'}
            </button>
            {error && <p className="mt-2 text-sm text-crimson">{error}</p>}
          </StepCard>
        </div>

        <aside className="lg:col-span-5">
          <div className="space-y-4 lg:sticky lg:top-24">
            <Card
              title="Live preview"
              sub="Your top offer updates as you change the inputs"
              action={liveLoading ? <Loader2 size={16} className="animate-spin text-slate-400" /> : liveBest && <Badge tone={riskTone(liveBest.risk)} dot>Risk {liveBest.risk}/5</Badge>}
            >
              {live && liveBest ? (
                <div className={`transition-opacity ${liveLoading ? 'opacity-60' : ''}`}>
                  <RadialGauge value={liveBest.score} inner={liveBest.p_approval * 100} label="best score" size={180} />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Borrow up to</p>
                      <p className="font-mono text-xl font-bold tabular-nums text-navy">{money(live.capacity.max_amount)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Best match</p>
                      <p className="font-mono text-xl font-bold tabular-nums text-navy">
                        {money(liveBest.amount)} <span className="text-sm text-slate-500">@ {liveBest.rate_pct.toFixed(2)}%</span>
                      </p>
                    </div>
                  </div>
                  <ScoreRadar offer={liveBest} height={210} />
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {live.offers.map((o, i) => (
                      <div key={o.label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <span className="flex items-center gap-2 font-semibold text-slate-700">
                          <i className="h-2.5 w-2.5 rounded-full" style={{ background: HEADS[i] }} />
                          {o.label}
                        </span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {money(o.amount)} · <b className="text-slate-900">{o.score}</b>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid h-64 place-items-center text-slate-400">
                  <Loader2 className="animate-spin" />
                </div>
              )}
              <button
                onClick={run}
                disabled={loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-crimson-600 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'Analyzing…' : 'Get my 3 loan offers'}
              </button>
            </Card>
          </div>
        </aside>
      </div>

      {result && best && (
        <div id="offer-results" className={`scroll-mt-24 space-y-6 ${loading ? 'opacity-60' : ''}`}>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Your offers</h2>
          <KpiRow offer={best} />

          {result.ai && (
            <Card
              title={result.ai.headline}
              action={<Badge tone="info"><Sparkles size={12} /> {result.ai.source === 'gemini' ? 'Gemini' : 'Model'}</Badge>}
              className="border-l-4 border-l-navy"
            >
              <p className="text-[15px] text-slate-600">{result.ai.summary}</p>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {result.ai.holding_back.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">What might hold you back</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {result.ai.holding_back.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Next steps</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {result.ai.next_steps.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {result.offers.map((offer, i) => (
              <OfferCard
                key={offer.label}
                offer={offer}
                color={HEADS[i]}
                selected={i === selected}
                onSelect={() => setSelected(i)}
                why={result.ai?.offers.find((o) => o.label === offer.label)?.why}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {other && <ScenarioCompare a={best} b={other} aTitle={best.label} bTitle={other.label} />}
            <RiskHeatMatrix matrix={result.risk_matrix} highlight={{ amount: best.amount, term_years: best.term_years }} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BalanceChart series={series} />
            <CashFlowChart series={series} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreBreakdownChart series={series} />
            <CapacityChart capacity={result.capacity} marker={result.desired_amount ?? undefined} markerLabel="You need" />
          </div>

          {sel && <FundingSankey funding={sel.offer.funding} title={`${sel.offer.label} offer (click a card to switch)`} />}

          <div className="grid gap-6 lg:grid-cols-2">
            <HistoryChart curve={result.history_curve} bucket={result.best_dscr_bucket} color={SERIES[bestIdx]} />
            <ComparablesChart comps={result.comparables} offer={best} color={SERIES[bestIdx]} />
          </div>

          <FactorsTable factors={result.factors} />

          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs tabular-nums text-slate-400">
            <span>Default model AUC {result.model.default_auc}</span>
            <span>Approval model AUC {result.model.approval_auc}</span>
            <span>Trained on {result.model.training_loans.toLocaleString()} historical loans</span>
            <span>Borrowing capacity {money(result.capacity.max_amount)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
