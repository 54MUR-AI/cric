import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Wrench, FileText, Home, LogOut,
} from 'lucide-react'
import { NAV_ITEMS } from '../../lib/constants'
import { useAuth } from '../../hooks/useAuth'

const iconMap = { LayoutDashboard, Calendar, Wrench, FileText, Home }

export default function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="flex w-56 flex-col bg-emerald-900 text-stone-100">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-emerald-800">
        <Home className="h-5 w-5" />
        <span className="font-semibold text-sm">CRIC Island Manager</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-emerald-800 text-white' : 'text-stone-300 hover:bg-emerald-800 hover:text-white'
                }`
              }
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-emerald-800 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-medium">
            {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span className="text-sm truncate">{profile?.display_name || 'User'}</span>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-stone-400 hover:text-white hover:bg-emerald-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
