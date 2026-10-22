import { healthLabel, pct } from '../format'
import { useIsBanker } from '../hooks/useView'
import type { Offer } from '../types'
import { riskTone, scoreTone } from '../ui/Badge'
import Stat from '../ui/Stat'

const RISK_NAMES = ['', 'Very low', 'Low', 'Moderate', 'Elevated', 'High']

/** 4-column KPI summary for one offer/request; sparkline = remaining balance paydown. */
export default function KpiRow({ offer }: { offer: Offer }) {
  const banker = useIsBanker()
  const paydown = offer.balances.map((b) => b.balance)
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat
        label="Score"
        sub="1–100, higher is better"
        value={offer.score}
        badge={{ text: offer.score >= 75 ? 'Strong' : offer.score >= 50 ? 'Fair' : 'Weak', tone: scoreTone(offer.score) }}
        spark={paydown}
        sparkColor="#012169"
      />
      {banker ? (
        <Stat
          label="Risk tier"
          sub={`${pct(offer.p_default, 1)} default probability`}
          value={`${offer.risk}/5`}
          accent={offer.risk >= 4 ? 'crimson' : 'navy'}
          badge={{ text: RISK_NAMES[offer.risk], tone: riskTone(offer.risk) }}
        />
      ) : (
        <Stat
          label="Loan health"
          sub="How comfortably this loan fits"
          value={<span className="text-[22px]">{healthLabel(offer.risk)}</span>}
          accent={offer.risk >= 4 ? 'crimson' : 'navy'}
          badge={{ text: offer.risk <= 2 ? 'Healthy' : offer.risk === 3 ? 'OK' : 'At risk', tone: riskTone(offer.risk) }}
        />
      )}
      <Stat
        label="Approval odds"
        sub="From the approval model"
        value={pct(offer.p_approval)}
        badge={{ text: offer.p_approval >= 0.8 ? 'Likely' : offer.p_approval >= 0.5 ? 'Possible' : 'Unlikely', tone: offer.p_approval >= 0.8 ? 'good' : offer.p_approval >= 0.5 ? 'warn' : 'critical' }}
      />
      <Stat
        label="Coverage (DSCR)"
        sub="BofA guideline ≥ 1.25x"
        value={`${offer.post_dscr.toFixed(2)}x`}
        accent={offer.post_dscr < 1.25 ? 'crimson' : 'navy'}
        badge={{ text: offer.post_dscr >= 1.5 ? 'Healthy' : offer.post_dscr >= 1.25 ? 'Tight' : 'Below', tone: offer.post_dscr >= 1.5 ? 'good' : offer.post_dscr >= 1.25 ? 'warn' : 'critical' }}
      />
    </div>
  )
}
