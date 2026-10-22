import type { ReactNode } from 'react'
import Badge, { type Tone } from './Badge'

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  badge?: { text: string; tone: Tone }
  spark?: number[]
  sparkColor?: string
  accent?: 'navy' | 'crimson'
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 120
  const h = 36
  const min = Math.min(...data)
  const max = Math.max(...data)
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - 3 - ((d - min) / (max - min || 1)) * (h - 6)])
  const line = pts.map((p) => p.join(',')).join(' ')
  const gid = `g${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-28" aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** KPI tile: big tabular number, label, optional delta badge and sparkline. */
export default function Stat({ label, value, sub, badge, spark, sparkColor = '#2563eb', accent = 'navy' }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`font-mono text-[28px] font-bold leading-none tabular-nums ${accent === 'crimson' ? 'text-crimson' : 'text-navy'}`}>
          {value}
        </div>
        {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-600">{label}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} color={sparkColor} />}
      </div>
    </div>
  )
}
