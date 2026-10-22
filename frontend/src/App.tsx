import { ChevronRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMeta } from './api'
import CompanyForm from './components/CompanyForm'
import Landing from './pages/Landing'
import OfferMode from './pages/OfferMode'
import ReverseMode, { type RequestDraft } from './pages/ReverseMode'
import type { Company, Meta, Preset } from './types'

type Mode = 'offers' | 'evaluate'
type Route = 'home' | Mode

// Hash routes: #/ landing, #/offers and #/evaluate the two app modes.
function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  return h === 'offers' || h === 'evaluate' ? h : 'home'
}

const NAV: { route: Route; label: string; short: string }[] = [
  { route: 'home', label: 'Home', short: 'Home' },
  { route: 'offers', label: 'Get Offers', short: 'Offers' },
  { route: 'evaluate', label: 'Evaluate Loan', short: 'Evaluate' },
]

/** Our own flag-stripe mark (not the BofA logo). */
function Mark() {
  return (
    <svg viewBox="0 0 40 24" className="h-6 w-10" aria-hidden>
      <path d="M4 18 L18 6 h6 L10 18 z" fill="#e31837" />
      <path d="M14 18 L28 6 h6 L20 18 z" fill="#012169" />
      <path d="M24 18 L38 6 h-4 L20 18 z" fill="#e31837" opacity="0.55" />
    </svg>
  )
}

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [error, setError] = useState('')
  const [route, setRoute] = useState<Route>(readRoute)
  const [company, setCompany] = useState<Company | null>(null)
  const [request, setRequest] = useState<RequestDraft | null>(null)
  const [presetKey, setPresetKey] = useState(0)

  useEffect(() => {
    getMeta()
      .then((m) => {
        setMeta(m)
        setCompany(m.presets[0].company)
        setRequest(m.presets[0].request)
      })
      .catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route) => {
    window.location.hash = r === 'home' ? '/' : `/${r}`
  }

  function applyPreset(p: Preset) {
    setCompany(p.company)
    setRequest(p.request)
    setPresetKey((k) => k + 1) // remount pages so stale results and inputs reset
  }

  const form =
    meta && company ? (
      <CompanyForm company={company} onChange={setCompany} industries={meta.industries} presets={meta.presets} onPreset={applyPreset} />
    ) : null

  const mode: Mode = route === 'evaluate' ? 'evaluate' : 'offers'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-6">
          <button className="flex flex-none items-center gap-2" onClick={() => go('home')} aria-label="Loan Clarity home">
            <Mark />
            <span className="whitespace-nowrap text-[17px] font-extrabold tracking-tight text-navy">Loan Clarity</span>
          </button>
          <span className="hidden h-6 w-px bg-slate-200 md:block" />
          <nav className="flex h-16 items-stretch gap-1 overflow-x-auto" aria-label="Main">
            {NAV.map((n) => (
              <button
                key={n.route}
                onClick={() => go(n.route)}
                className={`relative whitespace-nowrap px-2.5 text-sm font-semibold transition sm:px-3 ${n.route === 'home' ? 'hidden sm:block' : ''} ${
                  route === n.route ? 'text-navy' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span className="sm:hidden">{n.short}</span>
                <span className="hidden sm:inline">{n.label}</span>
                {route === n.route && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-navy" />}
              </button>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                meta?.ai_enabled ? 'bg-navy-50 text-navy ring-navy/15' : 'bg-slate-100 text-slate-500 ring-slate-300'
              }`}
              title={meta?.ai_enabled ? 'Explanations written by Gemini' : 'No GEMINI_API_KEY set: built-in explanations'}
            >
              <Sparkles size={13} /> AI: {meta?.ai_enabled ? 'Gemini' : 'model'}
            </span>
            <button onClick={() => go('offers')} className="rounded-lg bg-crimson px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-crimson-600">
              Get offers
            </button>
          </div>
        </div>
      </header>

      {route === 'home' ? (
        <Landing meta={meta} onStart={go} />
      ) : (
        <main className="mx-auto max-w-[1320px] px-4 pb-20 pt-5 sm:px-6">
          <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
            <button onClick={() => go('home')} className="hover:text-navy">
              Dashboard
            </button>
            <ChevronRight size={14} />
            <span className="font-semibold text-slate-900">{mode === 'offers' ? 'Get Loan Offers' : 'Evaluate My Loan'}</span>
          </nav>
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {mode === 'offers' ? (
                <>
                  Know what you can <span className="text-crimson">borrow.</span>
                </>
              ) : (
                <>
                  Is your loan a <span className="text-crimson">good one?</span>
                </>
              )}
            </h1>
            <p className="mt-2 max-w-3xl text-[15px] text-slate-600">
              {mode === 'offers'
                ? 'Three tailored offers built from your financials and 6,000 historical loans. Each is scored 1–100 (higher is better) and rated for risk 1–5 (5 is riskiest).'
                : 'Adjust the loan you have in mind. The live scorecard updates as you go; run the full analysis for explanations and better-scoring alternatives.'}
            </p>
          </div>
          {error && (
            <div className="mb-6 rounded-xl border border-crimson/30 bg-crimson-50 p-4 text-sm text-crimson-600">
              Could not reach the API. Is the backend running? {error}
            </div>
          )}
          {meta && company && request && (
            <>
              <div hidden={mode !== 'offers'}>
                <OfferMode key={`o${presetKey}`} meta={meta} company={company} companyForm={form} />
              </div>
              <div hidden={mode !== 'evaluate'}>
                <ReverseMode key={`r${presetKey}`} meta={meta} company={company} companyForm={form} initial={request} />
              </div>
            </>
          )}
        </main>
      )}
    </div>
  )
}
