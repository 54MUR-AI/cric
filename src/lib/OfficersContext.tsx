import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from './supabase'

export interface OfficerProfile {
  display_name: string
}

export interface Officer {
  id: string
  profile_id: string
  title: string
  sort_order: number
  profile: OfficerProfile | null
}

interface OfficersContextValue {
  officers: Officer[]
  refreshOfficers: () => void
}

const OfficersContext = createContext<OfficersContextValue | null>(null)

export function OfficersProvider({ children }: { children: ReactNode }) {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshOfficers = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    supabase.from('officers').select('*, profile:profile_id(display_name)').order('sort_order').then(({ data }) => setOfficers((data as Officer[]) || []))
  }, [refreshKey])

  return (
    <OfficersContext.Provider value={{ officers, refreshOfficers }}>
      {children}
    </OfficersContext.Provider>
  )
}

export function useOfficers(): OfficersContextValue {
  const ctx = useContext(OfficersContext)
  if (!ctx) throw new Error('useOfficers must be used within OfficersProvider')
  return ctx
}
