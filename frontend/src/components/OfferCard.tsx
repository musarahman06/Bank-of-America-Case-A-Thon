import { Star } from 'lucide-react'
import { money, moneyFull, pct } from '../format'
import type { Offer } from '../types'
import { RiskMeter, ScoreBadge } from './Badges'

interface Props {
  offer: Offer
  color: string
  selected: boolean
  onSelect: () => void
  why?: string
  compareTo?: number
}

/** Scenario-style offer card: colored header band, big amount, key terms. */
export default function OfferCard({ offer, color, selected, onSelect, why, compareTo }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        selected ? 'border-transparent ring-2' : 'border-slate-200'
      }`}
      style={selected ? ({ '--tw-ring-color': color } as React.CSSProperties) : undefined}
    >
      <div className="relative px-5 py-4 text-white" style={{ background: color }}>
        {offer.recommended && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-crimson">
            <Star size={11} fill="currentColor" /> Recommended
          </span>
        )}
        <p className="text-base font-bold">{offer.label}</p>
        <p className="pr-24 text-xs text-white/85">{offer.tagline}</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</p>
            <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-900">{money(offer.amount)}</p>
            <p className="text-xs text-slate-500">
              {offer.loan_type} · {offer.term_years} yrs · <span className="font-mono tabular-nums">{offer.rate_pct.toFixed(2)}%</span>
            </p>
          </div>
          <ScoreBadge score={offer.score} />
        </div>

        <RiskMeter risk={offer.risk} />

        <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100 text-sm">
          {[
            ['Monthly payment', moneyFull(offer.monthly_payment)],
            ['Total interest', money(offer.total_interest)],
            ['Approval odds', pct(offer.p_approval)],
            ['Coverage (DSCR)', `${offer.post_dscr.toFixed(2)}x`],
          ].map(([k, v]) => (
            <div key={k} className="px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="font-mono font-semibold tabular-nums text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>

        {compareTo !== undefined && offer.score_vs_request !== undefined && (
          <p className={`text-xs font-semibold ${offer.score_vs_request > 0 ? 'text-green-700' : offer.score_vs_request < 0 ? 'text-crimson' : 'text-slate-500'}`}>
            {offer.score_vs_request > 0
              ? `▲ ${offer.score_vs_request} points better than your request`
              : offer.score_vs_request < 0
                ? `▼ ${-offer.score_vs_request} points below your request`
                : 'Same score as your request'}
          </p>
        )}
        {why && <p className="rounded-lg bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-600">{why}</p>}
      </div>
    </div>
  )
}
