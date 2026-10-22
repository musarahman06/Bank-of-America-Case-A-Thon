import type { CSSProperties } from 'react'
import { RISK_COLORS, scoreStatus } from '../format'

export function ScoreBadge({ score, large = false }: { score: number; large?: boolean }) {
  const s = scoreStatus(score)
  return (
    <div className={`score${large ? ' lg' : ''}`} title={`Score ${score} out of 100 — higher is better`}>
      <div className="score-ring" style={{ '--v': score, '--c': s.color } as CSSProperties}>
        <div>{score}</div>
      </div>
      <small>
        {s.icon} {s.label} · /100
      </small>
    </div>
  )
}

const RISK_NAMES = ['', 'Very Low', 'Low', 'Moderate', 'Elevated', 'High']

export function RiskMeter({ risk }: { risk: number }) {
  return (
    <div className="risk" title={`Risk ${risk} of 5 — 5 is riskiest`}>
      <div className="risk-bars" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} style={i <= risk ? { background: RISK_COLORS[risk] } : undefined} />
        ))}
      </div>
      <div className="risk-label">
        Risk <b>{risk}/5</b> · {RISK_NAMES[risk]}
      </div>
    </div>
  )
}

const STATUS = {
  ok: { color: 'var(--status-good)', label: 'Strong' },
  warn: { color: 'var(--status-warning)', label: 'Watch' },
  bad: { color: 'var(--status-critical)', label: 'Holding back' },
}

export function StatusTag({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status]
  return (
    <span className="status">
      <i style={{ background: s.color }} />
      {s.label}
    </span>
  )
}
