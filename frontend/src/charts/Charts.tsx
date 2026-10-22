import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { money, pct } from '../format'
import type { Capacity, Comparables, HistoryPoint, Offer } from '../types'

export interface Series {
  offer: Offer
  color: string
}

const AXIS = { stroke: 'var(--text-muted)', fontSize: 11, tickLine: false, axisLine: false }
const GRID = <CartesianGrid stroke="var(--grid)" vertical={false} />

interface TipProps {
  active?: boolean
  label?: string | number
  payload?: readonly { name?: unknown; value?: unknown; color?: string; fill?: string; payload?: Record<string, unknown> }[]
}

function makeTip(fmt: (v: number) => string, title?: (label: string | number) => string) {
  return function Tip({ active, payload, label }: TipProps) {
    if (!active || !payload?.length) return null
    return (
      <div className="tooltip">
        <b>{title ? title(label ?? '') : label}</b>
        {payload.map((p) => (
          <div key={String(p.name)}>
            <i style={{ background: p.color || p.fill }} />
            {String(p.name)}: {fmt(Number(p.value))}
          </div>
        ))}
      </div>
    )
  }
}

export function Legend({ items, box = false }: { items: { name: string; color: string }[]; box?: boolean }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.name}>
          <i className={box ? 'box' : ''} style={{ background: i.color }} />
          {i.name}
        </span>
      ))}
    </div>
  )
}

/** Remaining principal over the life of each loan. */
export function BalanceChart({ series }: { series: Series[] }) {
  const years = Math.max(...series.map((s) => s.offer.term_years))
  const data = Array.from({ length: years + 1 }, (_, y) => {
    const row: Record<string, number | null> = { year: y }
    series.forEach((s) => (row[s.offer.label] = s.offer.balances[y]?.balance ?? null))
    return row
  })
  return (
    <div className="card">
      <h3>Balance owed over time</h3>
      <p className="sub">How quickly each option is paid down (lines of credit stay flat until maturity).</p>
      <Legend items={series.map((s) => ({ name: s.offer.label, color: s.color }))} />
      <div className="chart">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            {GRID}
            <XAxis dataKey="year" {...AXIS} tickFormatter={(y) => `Yr ${y}`} />
            <YAxis {...AXIS} tickFormatter={money} width={56} />
            <Tooltip content={makeTip(money, (y) => `Year ${y}`)} cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }} />
            {series.map((s) => (
              <Line
                key={s.offer.label}
                dataKey={s.offer.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--surface-1)', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Share of operating cash flow consumed by all debt payments after the new loan (1 / DSCR). */
export function CashFlowChart({ series }: { series: Series[] }) {
  const data = series.map((s) => ({
    name: s.offer.label,
    value: Math.min(1 / Math.max(s.offer.post_dscr, 0.01), 2),
    color: s.color,
  }))
  return (
    <div className="card">
      <h3>Cash flow used by debt payments</h3>
      <p className="sub">Share of yearly EBITDA going to all debt payments after the loan. BofA's guideline caps it at 80% (1.25x coverage).</p>
      <div className="chart">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 22, right: 40, bottom: 0, left: 8 }} barCategoryGap="30%">
            <CartesianGrid stroke="var(--grid)" horizontal={false} />
            <XAxis type="number" {...AXIS} tickFormatter={(v) => pct(v)} domain={[0, (max: number) => Math.max(1, Math.ceil(max * 10) / 10)]} />
            <YAxis type="category" dataKey="name" {...AXIS} width={120} />
            <Tooltip content={makeTip((v) => pct(v, 1))} cursor={{ fill: 'var(--surface-2)' }} />
            <ReferenceLine x={0.8} stroke="var(--status-critical)" strokeDasharray="4 3" label={{ value: '80% limit', position: 'top', fill: 'var(--text-secondary)', fontSize: 11 }} />
            <Bar dataKey="value" name="Cash flow to debt" radius={[0, 4, 4, 0]} isAnimationActive={false} label={{ position: 'right', formatter: (v: unknown) => pct(Number(v)), fill: 'var(--text-secondary)', fontSize: 11 }}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const PARTS: { key: keyof Offer['score_breakdown']; label: string }[] = [
  { key: 'approval', label: 'Approval odds (30%)' },
  { key: 'affordability', label: 'Affordability (25%)' },
  { key: 'cost', label: 'Cost (20%)' },
  { key: 'fit', label: 'Fit to need (15%)' },
  { key: 'safety', label: 'Low risk (10%)' },
]

/** What drives each option's 1-100 score. */
export function ScoreBreakdownChart({ series }: { series: Series[] }) {
  const data = PARTS.map((p) => {
    const row: Record<string, string | number> = { part: p.label }
    series.forEach((s) => (row[s.offer.label] = s.offer.score_breakdown[p.key]))
    return row
  })
  return (
    <div className="card">
      <h3>How the score is built</h3>
      <p className="sub">Each component is rated 0–100, then weighted into the overall score.</p>
      <Legend box items={series.map((s) => ({ name: `${s.offer.label} — ${s.offer.score}`, color: s.color }))} />
      <div className="chart tall">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid stroke="var(--grid)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} {...AXIS} />
            <YAxis type="category" dataKey="part" {...AXIS} width={130} />
            <Tooltip content={makeTip((v) => v.toFixed(0))} cursor={{ fill: 'var(--surface-2)' }} />
            {series.map((s) => (
              <Bar key={s.offer.label} dataKey={s.offer.label} fill={s.color} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Maximum amount within guidelines at each term. */
export function CapacityChart({ capacity, marker, markerLabel }: { capacity: Capacity; marker?: number; markerLabel?: string }) {
  const data = capacity.by_term.map((c) => ({ term: `${c.term_years} yr`, value: c.max_amount }))
  return (
    <div className="card">
      <h3>How much you could borrow</h3>
      <p className="sub">Most you can borrow at each term while keeping at least 1.25x coverage and at most 4.0x leverage.</p>
      <div className="chart">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: 0 }} barCategoryGap="35%">
            {GRID}
            <XAxis dataKey="term" {...AXIS} />
            <YAxis {...AXIS} tickFormatter={money} width={56} domain={[0, (max: number) => Math.max(max, (marker ?? 0) * 1.1)]} />
            <Tooltip content={makeTip(money, (t) => `${t} term`)} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="value" name="Max amount" fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} label={{ position: 'top', formatter: (v: unknown) => money(Number(v)), fill: 'var(--text-secondary)', fontSize: 11 }} />
            {marker ? (
              <ReferenceLine y={marker} stroke="var(--series-request)" strokeDasharray="4 3" label={{ value: markerLabel ?? 'Requested', position: 'insideTopRight', fill: 'var(--text-secondary)', fontSize: 11 }} />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Historical default rate by coverage bucket, highlighting where this loan sits. */
export function HistoryChart({ curve, bucket, color }: { curve: HistoryPoint[]; bucket: string; color: string }) {
  return (
    <div className="card">
      <h3>What history says</h3>
      <p className="sub">Default rate of past approved loans, grouped by coverage (DSCR) after the loan. Highlighted: where this loan falls.</p>
      <div className="chart">
        <ResponsiveContainer>
          <BarChart data={curve} margin={{ top: 20, right: 12, bottom: 0, left: 0 }} barCategoryGap="20%">
            {GRID}
            <XAxis dataKey="bucket" {...AXIS} interval={0} fontSize={10} />
            <YAxis {...AXIS} tickFormatter={(v) => pct(v)} width={40} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={({ active, payload }: TipProps) =>
                active && payload?.length ? (
                  <div className="tooltip">
                    <b>DSCR {String(payload[0].payload?.bucket)}</b>
                    <div>Default rate: {pct(Number(payload[0].payload?.default_rate), 1)}</div>
                    <div>Approval rate: {pct(Number(payload[0].payload?.approval_rate))}</div>
                    <div>Loans: {String(payload[0].payload?.loans)}</div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="default_rate" name="Default rate" radius={[4, 4, 0, 0]} isAnimationActive={false} label={{ position: 'top', formatter: (v: unknown) => pct(Number(v), 1), fill: 'var(--text-secondary)', fontSize: 10 }}>
              {curve.map((c) => (
                <Cell key={c.bucket} fill={c.bucket === bucket ? color : 'var(--grid)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Model's view of this loan vs. outcomes of the most similar historical loans. */
export function ComparablesChart({ comps, offer, color }: { comps: Comparables; offer: Offer; color: string }) {
  const data = [
    { metric: 'Approval rate', 'Similar past loans': comps.approval_rate, 'This loan (AI model)': offer.p_approval },
    { metric: 'Default rate', 'Similar past loans': comps.default_rate, 'This loan (AI model)': offer.p_default },
  ]
  const items = [
    { name: 'Similar past loans', color: 'var(--text-muted)' },
    { name: 'This loan (AI model)', color },
  ]
  return (
    <div className="card">
      <h3>Compared with {comps.count} similar past loans</h3>
      <p className="sub">
        Nearest matches by size, margins, leverage, coverage, credit and industry. Their average rate was {comps.avg_rate_pct.toFixed(2)}%.
      </p>
      <Legend box items={items} />
      <div className="chart">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: 0 }} barGap={2} barCategoryGap="30%">
            {GRID}
            <XAxis dataKey="metric" {...AXIS} />
            <YAxis {...AXIS} tickFormatter={(v) => pct(v)} width={40} domain={[0, 1]} />
            <Tooltip content={makeTip((v) => pct(v, 1))} cursor={{ fill: 'var(--surface-2)' }} />
            {items.map((i) => (
              <Bar key={i.name} dataKey={i.name} fill={i.color} radius={[4, 4, 0, 0]} isAnimationActive={false} label={{ position: 'top', formatter: (v: unknown) => pct(Number(v), 1), fill: 'var(--text-secondary)', fontSize: 11 }} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
