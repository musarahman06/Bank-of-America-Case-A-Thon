import type { CSSProperties } from 'react'
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

export default function OfferCard({ offer, color, selected, onSelect, why, compareTo }: Props) {
  return (
    <div
      className={`card offer${selected ? ' selected' : ''}`}
      style={{ '--offer-color': color } as CSSProperties}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      {offer.recommended && <div className="ribbon">★ RECOMMENDED</div>}
      <div className="offer-head">
        <div>
          <div className="offer-label">
            <span className="swatch" />
            {offer.label}
          </div>
          <div className="offer-tag">{offer.tagline}</div>
        </div>
        <ScoreBadge score={offer.score} />
      </div>
      <div>
        <div className="offer-amount">{money(offer.amount)}</div>
        <div className="offer-tag">
          {offer.loan_type} · {offer.term_years} years · {offer.rate_pct.toFixed(2)}% APR
        </div>
      </div>
      <RiskMeter risk={offer.risk} />
      <div className="kv">
        <div>
          <span>Monthly payment</span>
          <b>{moneyFull(offer.monthly_payment)}</b>
        </div>
        <div>
          <span>Total interest</span>
          <b>{money(offer.total_interest)}</b>
        </div>
        <div>
          <span>Approval odds</span>
          <b>{pct(offer.p_approval)}</b>
        </div>
        <div>
          <span>Coverage (DSCR)</span>
          <b>{offer.post_dscr.toFixed(2)}x</b>
        </div>
      </div>
      {compareTo !== undefined && offer.score_vs_request !== undefined && (
        <div className="offer-tag">
          {offer.score_vs_request > 0
            ? `▲ ${offer.score_vs_request} points better than your request`
            : offer.score_vs_request < 0
              ? `▼ ${-offer.score_vs_request} points below your request`
              : 'Same score as your request'}
        </div>
      )}
      {why && <p className="why">{why}</p>}
    </div>
  )
}
