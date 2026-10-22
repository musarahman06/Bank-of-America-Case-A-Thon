import type { Company, Preset } from '../types'

interface Props {
  company: Company
  onChange: (c: Company) => void
  industries: string[]
  presets: Preset[]
  onPreset: (p: Preset) => void
}

type NumKey = Exclude<keyof Company, 'name' | 'industry'>

// How each numeric field is shown in the form vs stored (USD, decimals).
const FIELDS: { key: NumKey; label: string; unit: 'M' | '%' | 'x' | ''; step: number; hint?: string }[] = [
  { key: 'annual_revenue', label: 'Annual revenue', unit: 'M', step: 1 },
  { key: 'ebitda_margin', label: 'EBITDA margin', unit: '%', step: 0.5 },
  { key: 'revenue_growth', label: 'Revenue growth', unit: '%', step: 1 },
  { key: 'existing_debt', label: 'Existing debt', unit: 'M', step: 0.5 },
  { key: 'collateral_value', label: 'Collateral', unit: 'M', step: 0.5, hint: 'Equipment, real estate, receivables' },
  { key: 'current_ratio', label: 'Current ratio', unit: 'x', step: 0.05 },
  { key: 'credit_score', label: 'Credit score', unit: '', step: 1, hint: 'Business credit, 300–850' },
  { key: 'years_in_business', label: 'Years operating', unit: '', step: 1 },
]

const toDisplay = (v: number, unit: string) => (unit === 'M' ? v / 1e6 : unit === '%' ? +(v * 100).toFixed(2) : v)
const fromDisplay = (v: number, unit: string) => (unit === 'M' ? v * 1e6 : unit === '%' ? v / 100 : v)

export default function CompanyForm({ company, onChange, industries, presets, onPreset }: Props) {
  const set = (patch: Partial<Company>) => onChange({ ...company, ...patch })
  return (
    <>
      <h3>Company profile</h3>
      <div className="field">
        <label htmlFor="preset">Load a demo company</label>
        <select
          id="preset"
          value=""
          onChange={(e) => {
            const p = presets.find((x) => x.id === e.target.value)
            if (p) onPreset(p)
          }}
        >
          <option value="">Choose a preset…</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="divider" />
      <div className="field">
        <label htmlFor="name">Company name</label>
        <input id="name" value={company.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="industry">Industry</label>
        <select id="industry" value={company.industry} onChange={(e) => set({ industry: e.target.value })}>
          {industries.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </div>
      <div className="row-2">
        {FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={f.key}>
              {f.label}
              {f.unit === 'M' ? ' ($M)' : f.unit === '%' ? ' (%)' : f.unit === 'x' ? ' (x)' : ''}
            </label>
            <input
              id={f.key}
              type="number"
              step={f.step}
              title={f.hint}
              value={toDisplay(company[f.key], f.unit)}
              onChange={(e) => set({ [f.key]: fromDisplay(Number(e.target.value), f.unit) } as Partial<Company>)}
            />
          </div>
        ))}
      </div>
    </>
  )
}
