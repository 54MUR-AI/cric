import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useToast } from '../components/ui/Toast'
import { usePushNotifications, sendPushToAll } from './usePushNotifications'

const NotificationContext = createContext(null)

const RECENT_WINDOW = 5

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const { subscribe } = usePushNotifications()
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('notif-seen') || '[]')) } catch { return new Set() }
  })
  const intervalRef = useRef(null)

  const markSeen = useCallback((ids) => {
    setSeenIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      sessionStorage.setItem('notif-seen', JSON.stringify([...next]))
      return next
    })
  }, [])

  useEffect(() => {
    if (!user) return

    const cutoff = new Date(Date.now() - RECENT_WINDOW * 60 * 1000).toISOString()

    async function check() {
      try {
        const [bookings, tasks, trips] = await Promise.all([
          supabase.from('bookings').select('id, user_id, start_date, end_date, cabins(name)').gt('created_at', cutoff).order('created_at', { ascending: false }),
          supabase.from('maintenance_tasks').select('id, created_by, title, due_date').gt('created_at', cutoff).order('created_at', { ascending: false }),
          supabase.from('boat_trips').select('id, created_by, trip_date, departure_time, destination').gt('created_at', cutoff).order('created_at', { ascending: false }),
        ])

        const newBookings = (bookings.data || []).filter(b => b.user_id !== user.id && !seenIds.has(`b-${b.id}`))
        const newTasks = (tasks.data || []).filter(t => t.created_by !== user.id && !seenIds.has(`t-${t.id}`))
        const newTrips = (trips.data || []).filter(t => t.created_by !== user.id && !seenIds.has(`tr-${t.id}`))

        const ids = []
        const pushItems = []

        newBookings.forEach(b => {
          ids.push(`b-${b.id}`)
          toast.info(`${b.cabins?.name || 'Cabin'} booked ${b.start_date?.slice(5)}–${b.end_date?.slice(5)}`)
          pushItems.push(`${b.cabins?.name || 'Cabin'} booked`)
        })
        newTasks.forEach(t => {
          ids.push(`t-${t.id}`)
          toast.info(`New task: ${t.title}`)
          pushItems.push(`Task: ${t.title}`)
        })
        newTrips.forEach(t => {
          ids.push(`tr-${t.id}`)
          toast.info(`New boat trip: ${t.destination} on ${t.trip_date?.slice(5)}`)
          pushItems.push(`Boat trip: ${t.destination}`)
        })

        if (ids.length) markSeen(ids)

        if (pushItems.length) {
          sendPushToAll({
            title: 'CRIC Manager',
            body: pushItems.slice(0, 3).join('\n') + (pushItems.length > 3 ? `\n+${pushItems.length - 3} more` : ''),
            tag: 'cric-activity',
            data: { url: '/' },
          })
        }
      } catch {}
    }

    check()
    intervalRef.current = setInterval(check, 60000)
    return () => clearInterval(intervalRef.current)
  }, [user, seenIds, markSeen, toast, subscribe])

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
