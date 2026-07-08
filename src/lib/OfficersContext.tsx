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
    Promise.all([
      supabase.from('officers').select('*').order('sort_order'),
      supabase.from('profiles').select('id, display_name'),
    ]).then(([offRes, profRes]) => {
      const profMap = new Map((profRes.data ?? []).map(p => [p.id, { display_name: p.display_name }]))
      const merged = (offRes.data ?? []).map(o => ({ ...o, profile: profMap.get(o.profile_id) ?? null }))
      setOfficers(merged as Officer[])
    })
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
