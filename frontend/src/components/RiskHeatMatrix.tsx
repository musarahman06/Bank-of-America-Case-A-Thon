import { money } from '../format'
import type { RiskMatrix } from '../types'
import Card from '../ui/Card'

const RISK_BG: Record<number, string> = {
  1: 'bg-green-100 text-green-900',
  2: 'bg-green-300 text-green-950',
  3: 'bg-amber-300 text-amber-950',
  4: 'bg-orange-400 text-white',
  5: 'bg-crimson text-white',
}
const LABELS = ['', 'Very low', 'Low', 'Moderate', 'Elevated', 'High']

/** CSS-grid heat matrix: risk tier for each amount × term around the loan. */
export default function RiskHeatMatrix({ matrix, highlight }: { matrix: RiskMatrix; highlight?: { amount: number; term_years: number } }) {
  const cell = (a: number, t: number) => matrix.cells.find((c) => c.amount === a && c.term_years === t)
  const isHi = (a: number, t: number) =>
    highlight && t === highlight.term_years && Math.abs(a - highlight.amount) <= Math.max(1, highlight.amount * 0.02)

  return (
    <Card title="Risk heat matrix" sub="Risk tier (1–5) and score for nearby amounts and terms. Outlined: this loan.">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[420px] gap-1.5"
          style={{ gridTemplateColumns: `72px repeat(${matrix.amounts.length}, minmax(64px, 1fr))` }}
          role="table"
          aria-label="Risk by amount and term"
        >
          <div />
          {matrix.amounts.map((a) => (
            <div key={a} className="pb-1 text-center font-mono text-xs font-semibold tabular-nums text-slate-500" role="columnheader">
              {money(a)}
            </div>
          ))}
          {matrix.terms.map((t) => (
            <div key={t} className="contents" role="row">
              <div className="flex items-center text-xs font-semibold text-slate-600" role="rowheader">
                {t} yr
              </div>
              {matrix.amounts.map((a) => {
                const c = cell(a, t)
                if (!c) return <div key={a} />
                return (
                  <div
                    key={a}
                    role="cell"
                    title={`${money(a)} over ${t} years: risk ${c.risk}/5 (${LABELS[c.risk]}), score ${c.score}`}
                    className={`grid h-14 place-items-center rounded-lg text-center transition hover:scale-[1.04] ${RISK_BG[c.risk]} ${
                      isHi(a, t) ? 'ring-[3px] ring-navy ring-offset-2' : ''
                    }`}
                  >
                    <span className="font-mono text-lg font-bold leading-none tabular-nums">{c.risk}</span>
                    <span className="font-mono text-[10px] tabular-nums opacity-80">score {c.score}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        {[1, 2, 3, 4, 5].map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5">
            <i className={`h-3 w-3 rounded ${RISK_BG[r].split(' ')[0]}`} /> {r} · {LABELS[r]}
          </span>
        ))}
      </div>
    </Card>
  )
}
