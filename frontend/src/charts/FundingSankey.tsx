import { ResponsiveContainer, Sankey, Tooltip } from 'recharts'
import type { LinkProps, NodeProps } from 'recharts/types/chart/Sankey'
import { money, pct } from '../format'
import type { Funding } from '../types'

const GROUP_COLORS: Record<string, string> = {
  'Client Deposits': 'var(--flow-deposits)',
  'Wholesale Funding': 'var(--flow-wholesale)',
  'Bank Capital': 'var(--flow-capital)',
}
const LOAN_COLOR = 'var(--flow-loan)'

interface FlowNode {
  name: string
  color: string
  amount: number
}

function SankeyNodeShape(props: NodeProps) {
  const { x, y, width, height, payload } = props
  const node = payload as unknown as FlowNode & { depth: number }
  const right = node.depth === 2
  const labelX = right ? x - 8 : x + width + 8
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(height, 2)} rx={2} fill={node.color} />
      <text
        x={labelX}
        y={y + height / 2}
        textAnchor={right ? 'end' : 'start'}
        dominantBaseline="middle"
        fontSize={11}
        fill="var(--text-primary)"
      >
        {node.name}
        <tspan fill="var(--text-secondary)"> {money(node.amount)}</tspan>
      </text>
    </g>
  )
}

function SankeyLinkShape(props: LinkProps) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props
  const color = (payload.source as unknown as FlowNode).color
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.28}
      strokeWidth={Math.max(linkWidth, 1)}
    />
  )
}

export default function FundingSankey({ funding, title }: { funding: Funding; title: string }) {
  const groupNames = funding.groups.map((g) => g.name)
  const nodes: FlowNode[] = [
    ...funding.sources.map((s) => ({ name: s.name, color: GROUP_COLORS[s.group], amount: s.amount })),
    ...funding.groups.map((g) => ({ name: g.name, color: GROUP_COLORS[g.name], amount: g.amount })),
    { name: 'Your loan', color: LOAN_COLOR, amount: funding.loan_amount },
  ]
  const nSrc = funding.sources.length
  const loanIdx = nodes.length - 1
  const links = [
    ...funding.sources.map((s, i) => ({ source: i, target: nSrc + groupNames.indexOf(s.group), value: s.amount })),
    ...funding.groups.map((g, i) => ({ source: nSrc + i, target: loanIdx, value: g.amount })),
  ]
  const deposits = funding.groups.find((g) => g.name === 'Client Deposits')?.amount ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-[15px] font-bold text-slate-900">Where the money comes from inside Bank of America</h3>
      <p className="mt-0.5 mb-3 text-[13px] leading-snug text-slate-500">
        {title}: how a {money(funding.loan_amount)} loan is funded across BofA's balance sheet, and how much of the
        bank's own capital regulators require it to set aside for this loan's risk.
      </p>
      <div className="mb-3 flex flex-wrap gap-6 text-[13px] text-slate-500">
        <div>
          <b className="block font-mono text-xl tabular-nums text-navy">{pct(deposits / funding.loan_amount)}</b>
          from client deposits
        </div>
        <div>
          <b className="block font-mono text-xl tabular-nums text-navy">{money(funding.equity_capital_held)}</b>
          BofA capital held ({pct(funding.risk_weight)} risk weight × {pct(funding.cet1_ratio, 1)} CET1)
        </div>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer>
          <Sankey
            data={{ nodes, links }}
            node={SankeyNodeShape}
            link={SankeyLinkShape}
            nodePadding={18}
            nodeWidth={10}
            margin={{ top: 10, right: 90, bottom: 10, left: 10 }}
            sort={false}
            iterations={0}
          >
            <Tooltip
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { payload?: { source?: FlowNode; target?: FlowNode; value?: number; name?: string; amount?: number } } | undefined
                const d = p?.payload
                if (!active || !d) return null
                return (
                  <div className="lc-tooltip">
                    {d.source && d.target ? (
                      <>
                        <b>
                          {d.source.name} → {d.target.name}
                        </b>
                        <div>
                          {money(d.value ?? 0)} ({pct((d.value ?? 0) / funding.loan_amount, 1)} of loan)
                        </div>
                      </>
                    ) : (
                      <>
                        <b>{d.name}</b>
                        <div>{money(d.amount ?? 0)}</div>
                      </>
                    )}
                  </div>
                )
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid gap-2" aria-label="Funding sources table">
        {funding.sources.map((s) => (
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs sm:grid-cols-[220px_1fr_110px]" key={s.name}>
            <span className="text-slate-700">{s.name}</span>
            <div className="col-span-2 h-2.5 overflow-hidden rounded bg-slate-100 sm:col-span-1 sm:row-auto row-start-2 sm:row-start-auto">
              <div className="h-full rounded" style={{ width: `${(s.amount / funding.loan_amount) * 100}%`, background: GROUP_COLORS[s.group] }} />
            </div>
            <b className="text-right font-mono tabular-nums text-slate-900">
              {money(s.amount)} · {pct(s.amount / funding.loan_amount)}
            </b>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        {funding.note} Source: {funding.source}.
      </p>
    </div>
  )
}
