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
    <>
      <header className={`topbar${route === 'home' ? ' on-home' : ''}`}>
        <div className="topbar-inner">
          <button className="brand" onClick={() => go('home')} aria-label="Loan Clarity home">
            <span className="brand-mark" aria-hidden>
              LC
            </span>
            <span>Loan Clarity</span>
          </button>
          <nav className="tabs" aria-label="Mode">
            <button className={route === 'offers' ? 'active' : ''} onClick={() => go('offers')}>
              Get Offers
            </button>
            <button className={route === 'evaluate' ? 'active' : ''} onClick={() => go('evaluate')}>
              Evaluate Loan
            </button>
          </nav>
        </div>
      </header>

      {route === 'home' ? (
        <Landing meta={meta} onStart={go} />
      ) : (
        <main className="app-main">
          <div className="hero">
            <p className="eyebrow">{mode === 'offers' ? '01 · Get loan offers' : '02 · Evaluate my loan'}</p>
            <h1 className="display md">
              {mode === 'offers' ? (
                <>
                  Know what you can <span className="accent">borrow.</span>
                </>
              ) : (
                <>
                  Is your loan a <span className="accent">good one?</span>
                </>
              )}
            </h1>
            <p>
              {mode === 'offers'
                ? 'Three tailored offers built from your financials and 6,000 historical loans. Each is scored 1–100 (higher is better) and rated for risk 1–5 (5 is riskiest).'
                : 'Bring the loan you have in mind. The model scores it, explains what is holding it back, and recommends alternatives that may serve you better.'}
            </p>
          </div>
          {error && (
            <div className="card error">
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
    </>
  )
}
