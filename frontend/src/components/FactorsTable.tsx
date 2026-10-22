import type { Factor } from '../types'
import Card from '../ui/Card'
import { StatusTag } from './Badges'

export default function FactorsTable({ factors }: { factors: Factor[] }) {
  return (
    <Card
      title="What's helping, and what's holding you back"
      sub="Each factor checked against BofA guidelines. “Score gain” is the model's what-if: how many points this loan's score rises if that factor reaches the target."
      bodyClassName="px-0 pb-2"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2.5">Factor</th>
              <th className="px-3 py-2.5">You</th>
              <th className="px-3 py-2.5">Target</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-5 py-2.5 text-right">Score gain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {factors.map((f) => (
              <tr key={f.factor} className="align-top transition hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <p className="font-semibold text-slate-900">{f.factor}</p>
                  {f.tip && <p className="mt-0.5 text-xs text-slate-500">{f.tip}</p>}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono tabular-nums text-slate-900">{f.value}</td>
                <td className="whitespace-nowrap px-3 py-3 font-mono tabular-nums text-slate-500">{f.benchmark}</td>
                <td className="px-3 py-3">
                  <StatusTag status={f.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-mono font-semibold tabular-nums text-green-700">
                  {f.score_gain_if_fixed > 0 ? `+${f.score_gain_if_fixed} pts` : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
