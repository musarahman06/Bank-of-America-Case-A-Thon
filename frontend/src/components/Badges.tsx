import { RISK_COLORS, scoreStatus } from '../format'
import Badge from '../ui/Badge'

/** Compact score ring (1-100, higher is better). */
export function ScoreBadge({ score }: { score: number }) {
  const s = scoreStatus(score)
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="grid justify-items-center" title={`Score ${score} out of 100 — higher is better`}>
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={s.color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-xl font-bold tabular-nums text-slate-900">{score}</span>
      </div>
      <span className="mt-1 whitespace-nowrap text-[11px] font-semibold text-slate-500">
        {s.icon} {s.label}
      </span>
    </div>
  )
}

const RISK_NAMES = ['', 'Very Low', 'Low', 'Moderate', 'Elevated', 'High']

/** Five-segment risk meter (5 is riskiest). */
export function RiskMeter({ risk }: { risk: number }) {
  return (
    <div className="grid gap-1.5" title={`Risk ${risk} of 5 — 5 is riskiest`}>
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} className="h-2 w-6 rounded-sm bg-slate-200" style={i <= risk ? { background: RISK_COLORS[risk] } : undefined} />
        ))}
      </div>
      <div className="text-xs text-slate-500">
        Risk <b className="font-mono tabular-nums text-slate-900">{risk}/5</b> · {RISK_NAMES[risk]}
      </div>
    </div>
  )
}

const STATUS = {
  ok: { tone: 'good', label: 'Strong' },
  warn: { tone: 'warn', label: 'Watch' },
  bad: { tone: 'critical', label: 'Holding back' },
} as const

export function StatusTag({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status]
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  )
}
