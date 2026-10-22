import type { ReactNode } from 'react'

interface Props {
  title?: ReactNode
  sub?: ReactNode
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children?: ReactNode
}

export default function Card({ title, sub, action, className = '', bodyClassName = '', children }: Props) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>}
            {sub && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={`p-5 ${title || action ? 'pt-4' : ''} ${bodyClassName}`}>{children}</div>
    </section>
  )
}
