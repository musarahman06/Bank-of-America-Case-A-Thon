import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type View = 'client' | 'banker'

const KEY = 'loan-clarity-view'
const ViewContext = createContext<{ view: View; setView: (v: View) => void }>({ view: 'client', setView: () => {} })

function readSaved(): View {
  try {
    return localStorage.getItem(KEY) === 'banker' ? 'banker' : 'client'
  } catch {
    return 'client'
  }
}

/**
 * Client view (default) is the borrower portal. Banker view adds lender-internal data
 * (default probability, risk tier, comparables, heat matrix, funding/capital).
 * Demo switch only: a real deployment gates Banker view behind BofA sign-in.
 */
export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>(readSaved)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, view)
    } catch {
      /* storage unavailable: keep in memory */
    }
  }, [view])
  return <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>
}

export const useView = () => useContext(ViewContext)
export const useIsBanker = () => useContext(ViewContext).view === 'banker'
