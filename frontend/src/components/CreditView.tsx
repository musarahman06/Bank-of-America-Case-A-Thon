import { Briefcase } from 'lucide-react'
import { money, pct } from '../format'
import type { Comparables, Offer } from '../types'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import { RiskMeter } from './Badges'

interface Props {
  offer: Offer
  comps: Comparables
  flags?: string[]
}

/** Banker-only underwriting summary: the lender-internal numbers behind the client-facing view. */
export default function CreditView({ offer, comps, flags = [] }: Props) {
  const fair = offer.fair_rate_pct ?? offer.rate_pct
  const rows: [string, string, string?][] = [
    ['Default probability (model)', pct(offer.p_default, 1)],
    ['Approval probability (model)', pct(offer.p_approval)],
    ['BofA risk-based rate', `${fair.toFixed(2)}%`, offer.rate_pct < fair - 0.25 ? `quoted ${offer.rate_pct.toFixed(2)}% is below price` : undefined],
    ['Leverage after loan', `${offer.post_leverage.toFixed(1)}x`],
    ['Collateral coverage', `${offer.collateral_coverage.toFixed(2)}x`],
    ['CET1 capital held', money(offer.funding.equity_capital_held), `${pct(offer.funding.risk_weight)} risk weight`],
    [`Comparables (${comps.count} loans)`, `${pct(comps.default_rate, 1)} default`, `${pct(comps.approval_rate)} approved · avg ${comps.avg_rate_pct.toFixed(2)}%`],
  ]
  return (
    <Card
      title="Credit view"
      sub={`Internal underwriting summary for ${offer.label.toLowerCase()}. Not shown to the client.`}
      action={
        <Badge tone="info">
          <Briefcase size={12} /> Banker only
        </Badge>
      }
      className="border-l-4 border-l-navy"
    >
      <div className="mb-4">
        <RiskMeter risk={offer.risk} />
      </div>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
        {rows.map(([k, v, note]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-[13px] text-slate-600">{k}</span>
            <span className="text-right">
              <span className="block font-mono text-sm font-bold tabular-nums text-slate-900">{v}</span>
              {note && <span className="block text-[11px] text-slate-400">{note}</span>}
            </span>
          </div>
        ))}
      </div>
      {flags.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {flags.map((f) => (
            <li key={f} className="rounded-lg border-l-[3px] border-crimson bg-crimson-50 px-3 py-2 text-xs text-crimson-600">
              {f}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
