export const money = (x: number) =>
  Math.abs(x) >= 1e9
    ? `$${(x / 1e9).toFixed(2)}B`
    : Math.abs(x) >= 1e6
      ? `$${(x / 1e6).toFixed(1)}M`
      : Math.abs(x) >= 1e3
        ? `$${(x / 1e3).toFixed(0)}K`
        : `$${x.toFixed(0)}`

export const moneyFull = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`

// Categorical slots 1-3 (validated all-pairs) for the three offers; request is neutral ink.
export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']
export const REQUEST_COLOR = 'var(--series-request)'

export function scoreStatus(score: number) {
  if (score >= 80) return { color: 'var(--status-good)', label: 'Excellent', icon: '▲' }
  if (score >= 65) return { color: 'var(--status-good)', label: 'Good', icon: '▲' }
  if (score >= 50) return { color: 'var(--status-warning)', label: 'Fair', icon: '◆' }
  return { color: 'var(--status-critical)', label: 'Weak', icon: '▼' }
}

export const RISK_COLORS: Record<number, string> = {
  1: 'var(--status-good)',
  2: 'var(--status-good)',
  3: 'var(--status-warning)',
  4: 'var(--status-serious)',
  5: 'var(--status-critical)',
}

// Client-facing wording for the internal 1-5 risk tier (mirrors backend explain.py HEALTH).
export function healthLabel(risk: number) {
  return risk <= 2 ? 'Strong fit' : risk === 3 ? 'Moderate fit' : risk === 4 ? 'Stretch' : 'Hard to approve'
}
