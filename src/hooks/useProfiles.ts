import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'

interface Profile {
  id: string
  display_name?: string
  email?: string
  is_admin?: boolean
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchProfiles() {
      try {
        const cached = await db.profiles.toArray()
        if (cached.length) setProfiles(cached)
        const { data } = await supabase.from('profiles').select('*').order('display_name')
        if (mounted && data) { setProfiles(data); db.profiles.bulkPut(data) }
      } catch { /* cached data is enough */ }
      finally { if (mounted) setLoading(false) }
    }
    fetchProfiles()
    return () => { mounted = false }
  }, [])

  return { profiles, loading }
}
