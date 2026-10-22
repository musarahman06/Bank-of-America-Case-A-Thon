import type { Factor } from '../types'
import { StatusTag } from './Badges'

export default function FactorsTable({ factors }: { factors: Factor[] }) {
  return (
    <div className="card">
      <h3>What's helping — and what's holding you back</h3>
      <p className="sub">
        Each factor checked against BofA guidelines. “Score gain” is the model's what-if: how many points this loan's
        score rises if that factor reaches the target.
      </p>
      <div className="table-wrap">
        <table className="factors">
          <thead>
            <tr>
              <th>Factor</th>
              <th>You</th>
              <th>Target</th>
              <th>Status</th>
              <th>Score gain</th>
            </tr>
          </thead>
          <tbody>
            {factors.map((f) => (
              <tr key={f.factor}>
                <td>
                  <b>{f.factor}</b>
                  {f.tip && <div className="tip">{f.tip}</div>}
                </td>
                <td className="num">{f.value}</td>
                <td className="num">{f.benchmark}</td>
                <td>
                  <StatusTag status={f.status} />
                </td>
                <td className="num">{f.score_gain_if_fixed > 0 ? `+${f.score_gain_if_fixed} pts` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
