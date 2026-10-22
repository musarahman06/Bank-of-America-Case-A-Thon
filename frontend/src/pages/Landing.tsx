import { ArrowRight, ChevronDown, Clock, Database, Gauge, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Reveal } from '../hooks/useReveal'
import type { Meta } from '../types'
import { HealthBadge } from '../components/Badges'
import Badge, { scoreTone } from '../ui/Badge'
import Card from '../ui/Card'
import RadialGauge from '../ui/RadialGauge'
import Stat from '../ui/Stat'

interface Props {
  meta: Meta | null
  onStart: (mode: 'offers' | 'evaluate') => void
}

// Illustrative offers (synthetic, not real BofA loans).
const SAMPLE_OFFERS = [
  { name: 'Precision Parts Co.', terms: '$57.8M · 7 yr · 6.49%', score: 95, risk: 1 },
  { name: 'CloudLedger Inc.', terms: '$10.6M · 10 yr · 7.04%', score: 93, risk: 1 },
  { name: 'Harbor Home Goods', terms: '$5.6M · 5 yr · 8.53%', score: 74, risk: 3 },
  { name: 'Harbor Home Goods (as requested)', terms: '$30.0M · 7 yr · 18.00%', score: 22, risk: 5 },
] as const

const STEPS = [
  ['Share financials', 'Eight numbers you already know, or upload a CSV.'],
  ['Model checks history', 'Your profile is compared with 6,000 historical loans.'],
  ['Three scored offers', 'Best Match, Maximum Capacity and Lowest Cost.'],
  ['Evaluate your own', 'See what holds your loan back, plus better options.'],
  ['Talk to your banker', 'Your relationship manager sees the same answer, with underwriting detail.'],
] as const

const WEIGHTS = [
  { part: 'Approval odds', w: 30 },
  { part: 'Affordability', w: 25 },
  { part: 'Cost', w: 20 },
  { part: 'Fit to need', w: 15 },
  { part: 'Loan health', w: 10 },
]

const FAQ = [
  ['What is Loan Clarity?', 'A Case-A-Thon prototype that gives mid-market businesses an instant, explainable view of what they can borrow from Bank of America, instead of waiting weeks for a decision.'],
  ['How is the 1–100 score calculated?', 'It blends approval likelihood (30%), affordability after the loan (25%), cost (20%), fit to the amount you need (15%) and loan health (10%). Higher is better for you.'],
  ['What does “loan health” mean?', 'A plain-language read on how comfortably a loan fits your business: Strong fit, Moderate fit, Stretch or Hard to approve. It comes from the same model your banker uses.'],
  ['Is this real Bank of America loan data?', 'No. BofA’s internal loan history is not public, so the models are trained on a synthetic, seeded dataset designed to behave like a real mid-market loan book.'],
  ['What is the Banker view?', 'An internal view for Bank of America relationship managers. It adds the underwriting detail behind each answer: a 1–5 risk tier, default probability, comparable past loans, a risk heat matrix and how BofA would fund the loan (illustrative, from its 4Q25 investor presentation). In this demo it is a switch; in production it would sit behind BofA sign-in.'],
  ['Is this a credit decision?', 'No. It is a decision-support demo. A relationship manager and full underwriting would confirm any real offer.'],
] as const

const CITIES = [
  ['Charlotte', 'America/New_York'],
  ['London', 'Europe/London'],
  ['Hong Kong', 'Asia/Hong_Kong'],
] as const

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Landing({ meta, onStart }: Props) {
  const now = useNow()
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <main className="mx-auto max-w-[1320px] space-y-6 px-4 pb-20 pt-6 sm:px-6">
      {/* ---------- hero banner ---------- */}
      <section className="hero-stripes relative overflow-hidden rounded-2xl text-white shadow-lg">
        <span className="absolute inset-y-0 left-0 w-2 bg-crimson" aria-hidden />
        <div className="grid items-center gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1.25fr_1fr] lg:py-14">
          <div>
            <p className="text-sm font-semibold text-white/75">Bank of America Case-A-Thon 2026 · Option A</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Loan answers in seconds,
              <br />
              not weeks.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">
              Mid-market businesses see what they can borrow, what it will cost and what might hold them back, instantly, with every number explained.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => onStart('offers')} className="inline-flex items-center gap-2 rounded-lg bg-crimson px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-crimson-600">
                Get my offers <ArrowRight size={16} />
              </button>
              <button onClick={() => onStart('evaluate')} className="rounded-lg border border-white/60 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Evaluate my loan
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm" aria-hidden>
            <div className="rounded-2xl border border-white/20 bg-white p-5 text-slate-900 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">Loan Clarity · sample</span>
                <Badge tone="critical">Best Match</Badge>
              </div>
              <RadialGauge value={95} inner={92} label="score / 100" size={170} />
              <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 rounded-lg border border-slate-100 text-center">
                {[
                  ['$57.8M', 'Amount'],
                  ['6.49%', 'Rate'],
                  ['Strong', 'Health'],
                ].map(([v, k]) => (
                  <div key={k} className="py-2">
                    <p className="font-mono text-sm font-bold tabular-nums">{v}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -left-6 top-10 hidden rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xl sm:block">
              <span className="text-green-600">●</span> Approval odds 92%
            </div>
            <div className="absolute -right-4 bottom-8 hidden rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xl sm:block">
              <span className="text-crimson">▲</span> Capacity up to $96.4M
            </div>
          </div>
        </div>
      </section>

      {/* ---------- KPI tiles ---------- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Historical loans" sub="Synthetic training set" value={(meta?.model.training_loans ?? 6000).toLocaleString()} badge={{ text: 'Seeded', tone: 'info' }} spark={[3, 4, 3.6, 5, 4.6, 6, 5.8, 7]} sparkColor="#16a34a" />
        <Stat label="Time to three offers" sub="vs. weeks today" value="0.2s" badge={{ text: 'Instant', tone: 'good' }} spark={[9, 8, 8.5, 6, 5, 3, 2, 1]} sparkColor="#e31837" accent="crimson" />
        <Stat label="Default model AUC" sub="Held-out accuracy" value={meta ? meta.model.default_auc.toFixed(2) : '0.83'} badge={{ text: 'Validated', tone: 'good' }} spark={[2, 3, 2.5, 4, 3.8, 5, 4.6, 5.5]} sparkColor="#2563eb" />
        <Stat label="Approval model AUC" sub="Held-out accuracy" value={meta ? meta.model.approval_auc.toFixed(2) : '0.92'} badge={{ text: 'Validated', tone: 'good' }} spark={[3, 3.5, 4, 3.8, 5, 5.4, 6, 6.6]} sparkColor="#2563eb" />
      </div>

      {/* ---------- bento ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Card title="How it works" sub="From financials to a scored, explained offer">
            <ol className="relative grid gap-5 sm:grid-cols-5 sm:gap-2">
              <span className="absolute left-[11px] top-3 h-[calc(100%-24px)] w-0.5 bg-slate-200 sm:left-[10%] sm:right-[10%] sm:top-[11px] sm:h-0.5 sm:w-auto" aria-hidden />
              {STEPS.map(([title, body], i) => (
                <li key={title} className="relative flex gap-3 sm:flex-col sm:items-center sm:text-center">
                  <span className={`relative z-10 grid h-6 w-6 flex-none place-items-center rounded-full font-mono text-[11px] font-bold ${i < 3 ? 'bg-navy text-white' : 'border-2 border-navy bg-white text-navy'}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card title="How the 1–100 score is built" sub="Weights used for every offer and evaluation">
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <BarChart data={WEIGHTS} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap="28%">
                  <XAxis type="number" hide domain={[0, 35]} />
                  <YAxis type="category" dataKey="part" width={100} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="w" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {WEIGHTS.map((w, i) => (
                      <Cell key={w.part} fill={i === 0 ? '#012169' : i === 1 ? '#e31837' : ['#2563eb', '#0d9488', '#d97706'][i - 2]} />
                    ))}
                    <LabelList dataKey="w" position="right" formatter={(v: unknown) => `${v}%`} style={{ fill: '#0f172a', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card title="Sample results" sub="Demo companies, illustrative" bodyClassName="px-0 pb-2">
            <ul className="divide-y divide-slate-100">
              {SAMPLE_OFFERS.map((o) => (
                <li key={o.name} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{o.name}</p>
                    <p className="font-mono text-xs tabular-nums text-slate-500">{o.terms}</p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <Badge tone={scoreTone(o.score)}>Score {o.score}</Badge>
                    <HealthBadge risk={o.risk} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card title="Built for clarity" sub="What every answer includes">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [Gauge, 'Score + loan health', 'Every option scored 1–100 with a plain-language health rating.'],
                [ShieldCheck, 'What holds you back', 'Each factor checked against BofA guidelines, with a what-if.'],
                [Database, 'Grounded in history', 'Compared with the most similar past loans.'],
                [Clock, 'Around the clock', CITIES.map(([c, tz]) => `${c} ${now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}`).join(' · ')],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Gauge
                return (
                  <div key={t as string} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <I size={18} className="text-navy" />
                    <p className="mt-2 text-sm font-bold text-slate-900">{t as string}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{d as string}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </Reveal>
      </div>

      {/* ---------- FAQ ---------- */}
      <Card title="Frequently asked questions" bodyClassName="px-0 pb-1">
        <div className="divide-y divide-slate-100">
          {FAQ.map(([q, a], i) => (
            <div key={q}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50">
                {q}
                <ChevronDown size={16} className={`flex-none text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{a}</p>}
            </div>
          ))}
        </div>
      </Card>

      {/* ---------- footer CTA ---------- */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-navy px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Ready to see your offers?</h2>
          <p className="mt-1 text-sm text-white/70">
            Case-A-Thon prototype · synthetic training data · not a credit decision · Banker view includes illustrative BofA funding figures (4Q25).
          </p>
        </div>
        <button onClick={() => onStart('offers')} className="inline-flex flex-none items-center gap-2 rounded-lg bg-crimson px-5 py-3 text-sm font-bold text-white transition hover:bg-crimson-600">
          Get my offers <ArrowRight size={16} />
        </button>
      </section>
    </main>
  )
}
