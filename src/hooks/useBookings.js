import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, cabins(name, color), profiles:user_id(display_name)')
      .order('start_date')
    setBookings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [])

  async function createBooking(booking) {
    const { data, error } = await supabase.from('bookings').insert(booking).select().single()
    if (error) throw error
    if (data) {
      const { data: full } = await supabase
        .from('bookings')
        .select('*, cabins(name, color), profiles:user_id(display_name)')
        .eq('id', data.id)
        .single()
      if (full) setBookings((prev) => [...prev, full])
    }
    return data
  }

  async function deleteBooking(id) {
    await supabase.from('bookings').delete().eq('id', id)
    setBookings((prev) => prev.filter((b) => b.id !== id))
  }

  return { bookings, loading, createBooking, deleteBooking, refetch: fetchBookings }
}
