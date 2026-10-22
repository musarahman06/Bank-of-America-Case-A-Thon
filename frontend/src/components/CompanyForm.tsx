import { Download } from 'lucide-react'
import { useState } from 'react'
import { money } from '../format'
import type { Company, Preset } from '../types'
import Badge from '../ui/Badge'
import Dropzone from '../ui/Dropzone'
import PillGroup from '../ui/PillGroup'
import Slider from '../ui/Slider'

interface Props {
  company: Company
  onChange: (c: Company) => void
  industries: string[]
  presets: Preset[]
  onPreset: (p: Preset) => void
}

type NumKey = Exclude<keyof Company, 'name' | 'industry'>

const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`

// Slider ranges; stored values stay in USD / decimals so the Company type is unchanged.
function fields(c: Company): { key: NumKey; label: string; min: number; max: number; step: number; scale?: 'log'; fmt: (v: number) => string; hint?: string }[] {
  const debtMax = Math.max(c.annual_revenue * 1.5, 20e6, c.existing_debt, c.collateral_value)
  return [
    { key: 'annual_revenue', label: 'Annual revenue', min: 5e6, max: 1e9, step: 1e5, scale: 'log', fmt: money },
    { key: 'ebitda_margin', label: 'EBITDA margin', min: -0.1, max: 0.4, step: 0.005, fmt: pct1 },
    { key: 'revenue_growth', label: 'Revenue growth (YoY)', min: -0.3, max: 0.6, step: 0.01, fmt: (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%` },
    { key: 'existing_debt', label: 'Existing debt', min: 0, max: debtMax, step: 2.5e5, fmt: money },
    { key: 'collateral_value', label: 'Collateral available', min: 0, max: debtMax, step: 2.5e5, fmt: money, hint: 'Equipment, real estate, receivables' },
    { key: 'current_ratio', label: 'Current ratio', min: 0.5, max: 4, step: 0.05, fmt: (v) => `${v.toFixed(2)}x` },
    { key: 'credit_score', label: 'Business credit score', min: 300, max: 850, step: 1, fmt: (v) => v.toFixed(0) },
    { key: 'years_in_business', label: 'Years in business', min: 0, max: 80, step: 1, fmt: (v) => `${v} yrs` },
  ]
}

// Validation bounds mirror backend/app/schemas.py CompanyProfile.
const BOUNDS: Record<NumKey, [number, number]> = {
  annual_revenue: [1, 1e12],
  ebitda_margin: [-0.5, 0.9],
  revenue_growth: [-1, 5],
  existing_debt: [0, 1e12],
  collateral_value: [0, 1e12],
  current_ratio: [0.01, 20],
  credit_score: [300, 850],
  years_in_business: [0, 200],
}
const NUM_KEYS = Object.keys(BOUNDS) as NumKey[]
const PERCENT_KEYS: NumKey[] = ['ebitda_margin', 'revenue_growth']

function parseNumber(raw: string, key: NumKey) {
  const s = raw.trim()
  const n = Number(s.replace(/[$,%\s]/g, ''))
  if (!Number.isFinite(n)) return null
  // "15%" or "15" for a percentage field means 0.15
  return PERCENT_KEYS.includes(key) && (s.endsWith('%') || Math.abs(n) > 1) ? n / 100 : n
}

/** Parse a CSV (key,value rows) or JSON financials file into Company fields. */
function parseFinancials(text: string, filename: string, industries: string[], base: Company): { company: Company; count: number } {
  let pairs: [string, string][]
  if (filename.toLowerCase().endsWith('.json')) {
    const obj = JSON.parse(text)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('JSON must be an object of field: value pairs.')
    pairs = Object.entries(obj).map(([k, v]) => [k, String(v)])
  } else {
    pairs = text
      .split(/\r?\n/)
      .map((l) => l.split(',').map((x) => x.trim().replace(/^"|"$/g, '')))
      .filter((r) => r.length >= 2 && r[0] && r[0].toLowerCase() !== 'field')
      .map((r) => [r[0], r.slice(1).join(',')])
  }
  const next = { ...base }
  let count = 0
  for (const [rawKey, rawVal] of pairs) {
    const key = rawKey.trim().toLowerCase().replace(/[\s-]+/g, '_')
    if (key === 'name' && rawVal) {
      next.name = rawVal
      count++
    } else if (key === 'industry') {
      const match = industries.find((i) => i.toLowerCase() === rawVal.trim().toLowerCase())
      if (match) {
        next.industry = match
        count++
      }
    } else if ((NUM_KEYS as string[]).includes(key)) {
      const k = key as NumKey
      const v = parseNumber(rawVal, k)
      if (v !== null) {
        const [lo, hi] = BOUNDS[k]
        next[k] = Math.min(hi, Math.max(lo, v))
        count++
      }
    }
  }
  if (!count) throw new Error('No recognised fields. Download the template to see the expected format.')
  return { company: next, count }
}

function downloadTemplate(c: Company) {
  const rows = [['field', 'value'], ['name', c.name], ['industry', c.industry], ...NUM_KEYS.map((k) => [k, String(c[k])])]
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'loan-clarity-financials.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function CompanyForm({ company, onChange, industries, presets, onPreset }: Props) {
  const set = (patch: Partial<Company>) => onChange({ ...company, ...patch })
  const [upload, setUpload] = useState<{ ok: boolean; text: string } | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  async function handleFile(file: File) {
    try {
      if (file.size > 200_000) throw new Error('File is too large (max 200 KB).')
      const { company: next, count } = parseFinancials(await file.text(), file.name, industries, company)
      onChange(next)
      setActivePreset(null)
      setUpload({ ok: true, text: `${file.name}: ${count} fields loaded` })
    } catch (e) {
      setUpload({ ok: false, text: e instanceof Error ? e.message : 'Could not read that file.' })
    }
  }

  return (
    <div className="space-y-6">
      <PillGroup
        label="Load a demo company"
        size="sm"
        options={presets.map((p) => ({ value: p.id, label: p.company.name }))}
        value={activePreset}
        onChange={(id) => {
          const p = presets.find((x) => x.id === id)
          if (p) {
            setActivePreset(id)
            onPreset(p)
          }
        }}
      />

      <div>
        <label htmlFor="company-name" className="mb-2 block text-[13px] font-semibold text-slate-700">
          Company name
        </label>
        <input
          id="company-name"
          value={company.name}
          onChange={(e) => set({ name: e.target.value })}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-4 focus:ring-navy/10"
        />
      </div>

      <PillGroup
        label="Industry"
        size="sm"
        options={industries.map((i) => ({ value: i, label: i }))}
        value={company.industry}
        onChange={(i) => set({ industry: i })}
      />

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {fields(company).map((f) => (
          <Slider
            key={f.key}
            label={f.label}
            value={company[f.key]}
            min={f.min}
            max={f.max}
            step={f.step}
            scale={f.scale}
            format={f.fmt}
            hint={f.hint}
            onChange={(v) => set({ [f.key]: v } as Partial<Company>)}
          />
        ))}
      </div>

      <Dropzone
        accept=".csv,.json,text/csv,application/json"
        title="Upload financials (CSV or JSON)"
        hint="Drop a file with field,value rows to fill this profile instantly. Read in your browser only, never uploaded."
        onFile={handleFile}
        preview={
          <div className="flex flex-wrap items-center gap-2">
            {upload && <Badge tone={upload.ok ? 'good' : 'critical'} dot>{upload.text}</Badge>}
            <button
              type="button"
              onClick={() => downloadTemplate(company)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy"
            >
              <Download size={13} /> Download template
            </button>
          </div>
        }
      />
    </div>
  )
}
