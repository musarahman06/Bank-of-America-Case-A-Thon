interface Option<T extends string | number> {
  value: T
  label: string
}

interface Props<T extends string | number> {
  label?: string
  options: Option<T>[]
  value: T | null
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}

/** Segmented pill selector (replaces native <select>). */
export default function PillGroup<T extends string | number>({ label, options, value, onChange, size = 'md' }: Props<T>) {
  const pad = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]'
  return (
    <div>
      {label && <p className="mb-2 text-[13px] font-semibold text-slate-700">{label}</p>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`rounded-full border font-semibold transition ${pad} ${
                active
                  ? 'border-navy bg-navy text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-navy/40 hover:text-navy'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
