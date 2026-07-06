import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const OfficersContext = createContext(null)

export function OfficersProvider({ children }) {
  const [officers, setOfficers] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshOfficers = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    supabase.from('officers').select('*, profile:profile_id(display_name)').order('sort_order').then(({ data }) => setOfficers(data || []))
  }, [refreshKey])

  return (
    <OfficersContext.Provider value={{ officers, refreshOfficers }}>
      {children}
    </OfficersContext.Provider>
  )
}

export function useOfficers() {
  const ctx = useContext(OfficersContext)
  if (!ctx) throw new Error('useOfficers must be used within OfficersProvider')
  return ctx
}
