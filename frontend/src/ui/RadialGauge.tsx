interface Props {
  /** 0-100, drawn on the outer navy ring. */
  value: number
  /** Optional 0-100 for the inner crimson ring (e.g. approval odds). */
  inner?: number
  label?: string
  size?: number
}

function arc(r: number, frac: number) {
  const c = 2 * Math.PI * r
  return { strokeDasharray: `${c * Math.max(0, Math.min(1, frac))} ${c}` }
}

/** Double-ring SVG gauge with a tabular score in the middle. */
export default function RadialGauge({ value, inner, label = '/100', size = 200 }: Props) {
  const outerR = 84
  const innerR = 66
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute inset-3 rounded-full bg-crimson/10 blur-xl" aria-hidden />
      <svg viewBox="0 0 200 200" className="relative h-full w-full -rotate-90" role="img" aria-label={`Score ${value} out of 100`}>
        <circle cx="100" cy="100" r={outerR} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="100"
          cy="100"
          r={outerR}
          fill="none"
          stroke="var(--color-navy)"
          strokeWidth="12"
          strokeLinecap="round"
          style={{ ...arc(outerR, value / 100), transition: 'stroke-dasharray 0.6s ease' }}
        />
        {inner !== undefined && (
          <>
            <circle cx="100" cy="100" r={innerR} fill="none" stroke="#fde2e7" strokeWidth="7" />
            <circle
              cx="100"
              cy="100"
              r={innerR}
              fill="none"
              stroke="var(--color-crimson)"
              strokeWidth="7"
              strokeLinecap="round"
              style={{ ...arc(innerR, inner / 100), transition: 'stroke-dasharray 0.6s ease' }}
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-mono text-5xl font-bold tabular-nums tracking-tight text-navy">{Math.round(value)}</div>
          <div className="text-xs font-semibold text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  )
}
