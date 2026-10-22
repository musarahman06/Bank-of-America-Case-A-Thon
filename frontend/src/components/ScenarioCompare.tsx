import { money, moneyFull, pct } from '../format'
import { useIsBanker } from '../hooks/useView'
import { HealthBadge } from './Badges'
import type { Offer } from '../types'
import Badge, { riskTone } from '../ui/Badge'
import Card from '../ui/Card'

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 140
  const h = 40
  const max = Math.max(...data, 1)
  const pts = data.map((d, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - 4 - (d / max) * (h - 8)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-32" preserveAspectRatio="none" aria-hidden>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function Side({ offer, title, sub, head }: { offer: Offer; title: string; sub: string; head: 'navy' | 'crimson' }) {
  const banker = useIsBanker()
  const color = head === 'navy' ? '#012169' : '#e31837'
  const rows: [string, string][] = [
    ['Amount', money(offer.amount)],
    ['Rate', `${offer.rate_pct.toFixed(2)}%`],
    ['Monthly payment', moneyFull(offer.monthly_payment)],
    ['Total interest', money(offer.total_interest)],
    ['Approval odds', pct(offer.p_approval)],
  ]
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="px-4 py-3 text-white" style={{ background: color }}>
        <p className="font-bold">{title}</p>
        <p className="text-xs text-white/85">{sub}</p>
      </div>
      <div className="divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">Score</p>
            <p className="font-mono text-3xl font-bold tabular-nums text-slate-900">{offer.score}</p>
          </div>
          <Spark data={offer.balances.map((b) => b.balance)} color={color} />
        </div>
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-slate-500">{k}</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="text-slate-500">{banker ? 'Risk tier' : 'Loan health'}</span>
          {banker ? (
            <Badge tone={riskTone(offer.risk)} dot>
              {offer.risk}/5 · {offer.risk_label}
            </Badge>
          ) : (
            <HealthBadge risk={offer.risk} />
          )}
        </div>
      </div>
    </div>
  )
}

/** Side-by-side comparison: the request (or top offer) vs the best alternative. */
export default function ScenarioCompare({ a, b, aTitle, bTitle }: { a: Offer; b: Offer; aTitle: string; bTitle: string }) {
  const diff = b.score - a.score
  return (
    <Card
      title="Scenario comparison"
      sub={diff > 0 ? `${bTitle} scores ${diff} points higher.` : diff < 0 ? `${aTitle} scores ${-diff} points higher.` : 'Both score the same.'}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Side offer={a} title={aTitle} sub={`${a.loan_type} · ${a.term_years} years`} head="navy" />
        <Side offer={b} title={bTitle} sub={`${b.loan_type} · ${b.term_years} years`} head="crimson" />
      </div>
      <p className="mt-3 text-xs text-slate-400">Sparkline: balance owed over the life of the loan.</p>
    </Card>
  )
}
