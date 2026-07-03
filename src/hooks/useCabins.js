import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCabins() {
  const [cabins, setCabins] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchCabins() {
    const { data } = await supabase.from('cabins').select('*').order('sort_order').order('name')
    setCabins(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCabins() }, [])

  async function createCabin(cabin) {
    const { data } = await supabase.from('cabins').insert(cabin).select().single()
    if (data) setCabins((prev) => [...prev, data])
    return data
  }

  async function updateCabin(id, updates) {
    const { data } = await supabase.from('cabins').update(updates).eq('id', id).select().single()
    if (data) setCabins((prev) => prev.map((c) => (c.id === id ? data : c)))
    return data
  }

  async function deleteCabin(id) {
    await supabase.from('cabins').delete().eq('id', id)
    setCabins((prev) => prev.filter((c) => c.id !== id))
  }

  return { cabins, loading, createCabin, updateCabin, deleteCabin, refetch: fetchCabins }
}
