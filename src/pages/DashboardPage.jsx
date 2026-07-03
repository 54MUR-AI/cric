import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [upcomingBookings, setUpcomingBookings] = useState([])
  const [openTasks, setOpenTasks] = useState([])
  const [nextMeeting, setNextMeeting] = useState(null)

  useEffect(() => {
    supabase.from('bookings').select('*, cabins(name)').gte('start_date', new Date().toISOString().split('T')[0]).order('start_date').limit(5).then(({ data }) => setUpcomingBookings(data || []))
    supabase.from('maintenance_tasks').select('*, maintenance_categories(name)').in('status', ['todo', 'in_progress']).order('due_date').limit(5).then(({ data }) => setOpenTasks(data || []))
    supabase.from('meetings').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(1).single().then(({ data }) => setNextMeeting(data || null))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-4 shadow-sm border border-stone-200">
          <h2 className="font-semibold text-stone-700 mb-3">Upcoming Bookings</h2>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-stone-400">No upcoming bookings</p>
          ) : (
            <ul className="space-y-2">
              {upcomingBookings.map((b) => (
                <li key={b.id} className="text-sm flex justify-between">
                  <span className="text-stone-600">{b.cabins?.name}</span>
                  <span className="text-stone-400">{formatDate(b.start_date)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/schedule" className="mt-3 inline-block text-sm text-emerald-700 hover:underline">View schedule →</Link>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border border-stone-200">
          <h2 className="font-semibold text-stone-700 mb-3">Open Tasks</h2>
          {openTasks.length === 0 ? (
            <p className="text-sm text-stone-400">No open tasks</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((t) => (
                <li key={t.id} className="text-sm flex justify-between">
                  <span className="text-stone-600 truncate">{t.title}</span>
                  <span className="text-stone-400">{t.maintenance_categories?.name}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/maintenance" className="mt-3 inline-block text-sm text-emerald-700 hover:underline">View all tasks →</Link>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border border-stone-200">
          <h2 className="font-semibold text-stone-700 mb-3">Next Meeting</h2>
          {nextMeeting ? (
            <div>
              <p className="text-sm font-medium text-stone-800">{nextMeeting.title}</p>
              <p className="text-sm text-stone-400">{formatDate(nextMeeting.date)}</p>
              <Link to="/meetings" className="mt-3 inline-block text-sm text-emerald-700 hover:underline">View meetings →</Link>
            </div>
          ) : (
            <p className="text-sm text-stone-400">No upcoming meetings</p>
          )}
        </div>
      </div>
    </div>
  )
}
