import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Offer } from '../types'

const AXES: { key: keyof Offer['score_breakdown']; label: string }[] = [
  { key: 'approval', label: 'Approval' },
  { key: 'affordability', label: 'Affordability' },
  { key: 'cost', label: 'Cost' },
  { key: 'fit', label: 'Fit' },
  { key: 'safety', label: 'Loan health' },
]

/** Radar of the five score components (0-100 each); optional comparison overlay. */
export default function ScoreRadar({ offer, compare, height = 230 }: { offer: Offer; compare?: Offer; height?: number }) {
  const data = AXES.map((a) => ({
    axis: a.label,
    you: Math.round(offer.score_breakdown[a.key]),
    alt: compare ? Math.round(compare.score_breakdown[a.key]) : undefined,
  }))
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {compare && (
            <Radar name={compare.label} dataKey="alt" stroke="var(--series-1)" fill="var(--series-1)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
          )}
          <Radar name={offer.label} dataKey="you" stroke="#012169" fill="#e31837" fillOpacity={0.35} strokeWidth={2} isAnimationActive={false} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="lc-tooltip">
                  <b>{String(label)}</b>
                  {payload.map((p) => (
                    <div key={String(p.name)}>
                      <i style={{ background: String(p.stroke) }} />
                      {String(p.name)}: {String(p.value)}/100
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
