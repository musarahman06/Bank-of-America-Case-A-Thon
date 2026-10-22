import type { ReactNode } from 'react'

export type Tone = 'good' | 'warn' | 'serious' | 'critical' | 'info' | 'neutral'

const TONES: Record<Tone, string> = {
  good: 'bg-green-50 text-green-700 ring-green-600/20',
  warn: 'bg-amber-50 text-amber-800 ring-amber-500/30',
  serious: 'bg-orange-50 text-orange-700 ring-orange-500/30',
  critical: 'bg-crimson-50 text-crimson-600 ring-crimson/25',
  info: 'bg-navy-50 text-navy ring-navy/15',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-400/20',
}

const DOTS: Record<Tone, string> = {
  good: 'bg-green-600',
  warn: 'bg-amber-500',
  serious: 'bg-orange-500',
  critical: 'bg-crimson',
  info: 'bg-navy',
  neutral: 'bg-slate-400',
}

export default function Badge({ tone = 'neutral', dot = false, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>
      {dot && <i className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />}
      {children}
    </span>
  )
}

export const scoreTone = (score: number): Tone => (score >= 75 ? 'good' : score >= 50 ? 'warn' : 'critical')
export const riskTone = (risk: number): Tone => (risk <= 2 ? 'good' : risk === 3 ? 'warn' : risk === 4 ? 'serious' : 'critical')
