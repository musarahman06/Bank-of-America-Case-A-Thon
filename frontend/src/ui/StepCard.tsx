import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  n: number
  title: string
  sub?: string
  open: boolean
  done?: boolean
  onToggle: () => void
  tag?: ReactNode
  children: ReactNode
}

/** Numbered collapsible card for the step-by-step input flow. */
export default function StepCard({ n, title, sub, open, done, onToggle, tag, children }: Props) {
  return (
    <section className={`rounded-xl border bg-white shadow-sm transition ${open ? 'border-navy/25' : 'border-slate-200'}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span
          className={`grid h-8 w-8 flex-none place-items-center rounded-full font-mono text-sm font-bold ${
            open ? 'bg-crimson text-white' : done ? 'bg-navy text-white' : 'border border-slate-300 text-slate-500'
          }`}
        >
          {done && !open ? <Check size={15} strokeWidth={3} /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-slate-900">{title}</span>
          {sub && <span className="block truncate text-[13px] text-slate-500">{sub}</span>}
        </span>
        {tag}
        <ChevronDown size={18} className={`flex-none text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-slate-100 px-5 pb-5 pt-4">{children}</div>}
    </section>
  )
}

/** The 1 › 2 › 3 progress strip shown above the step cards. */
export function Stepper({ steps, active, onSelect }: { steps: string[]; active: number; onSelect: (i: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(i)}
            className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-semibold transition ${
              i === active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-full font-mono text-[11px] ${
                i === active ? 'bg-crimson text-white' : i < active ? 'bg-navy text-white' : 'border border-slate-300'
              }`}
            >
              {i + 1}
            </span>
            {s}
          </button>
          {i < steps.length - 1 && <span className="text-slate-300">›</span>}
        </li>
      ))}
    </ol>
  )
}
