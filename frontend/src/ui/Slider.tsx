import { useId, type CSSProperties } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** 'log' spaces the track logarithmically (for values spanning orders of magnitude). */
  scale?: 'linear' | 'log'
  format: (v: number) => string
  onChange: (v: number) => void
  hint?: string
}

const STEPS = 1000

export default function Slider({ label, value, min, max, step = 1, scale = 'linear', format, onChange, hint }: Props) {
  const id = useId()
  const clamped = Math.min(max, Math.max(min, value))
  const toPos = (v: number) =>
    scale === 'log' ? (Math.log(v / min) / Math.log(max / min)) * STEPS : ((v - min) / (max - min)) * STEPS
  const fromPos = (p: number) => {
    const raw = scale === 'log' ? min * Math.pow(max / min, p / STEPS) : min + (p / STEPS) * (max - min)
    return Math.min(max, Math.max(min, Math.round(raw / step) * step))
  }
  const pos = toPos(clamped)
  const fill = `${(pos / STEPS) * 100}%`

  return (
    <div className="group">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-slate-700" title={hint}>
          {label}
        </label>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[13px] font-semibold tabular-nums text-navy">
          {format(clamped)}
        </span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="range"
          min={0}
          max={STEPS}
          step={1}
          value={pos}
          onChange={(e) => onChange(fromPos(Number(e.target.value)))}
          aria-valuetext={format(clamped)}
          className="lc-range"
          style={{ '--fill': fill } as CSSProperties}
        />
        {/* live value tooltip that rides the thumb while dragging/focused */}
        <span
          className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-navy px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-white opacity-0 shadow transition-opacity group-focus-within:opacity-100 group-active:opacity-100"
          style={{ left: `calc(${fill} + ${10 - (pos / STEPS) * 20}px)` }}
        >
          {format(clamped)}
        </span>
      </div>
    </div>
  )
}
