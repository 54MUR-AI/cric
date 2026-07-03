import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Wrench, FileText, Home, Users, BookOpen, ScrollText, Map, Image, LogOut, X, Moon, Sun,
} from 'lucide-react'
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '../../lib/constants'
import { useAuth } from '../../hooks/useAuth'
import { useDarkMode } from '../../lib/useDarkMode'

const iconMap = { LayoutDashboard, Calendar, Wrench, FileText, Home, Users, BookOpen, ScrollText, Map, Image }

function DarkModeToggle() {
  const { dark, toggle } = useDarkMode()
  return (
    <div className="px-4 py-2 border-t border-emerald-800">
      <button onClick={toggle} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-300 hover:bg-emerald-800 hover:text-white transition-colors">
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {dark ? 'Light Mode' : 'Dark Mode'}
      </button>
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const { profile, isAdmin, signOut } = useAuth()

  const nav = (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-5 border-b border-emerald-800">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          <span className="font-semibold text-sm">CRIC Manager</span>
        </div>
        <button onClick={onClose} className="md:hidden p-1 text-stone-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
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
        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3 text-xs font-medium text-emerald-500 uppercase tracking-wider">Admin</div>
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon]
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
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
          </>
        )}
      </nav>

      <DarkModeToggle />

      <div className="border-t border-emerald-800 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-medium">
            {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm truncate block">{profile?.display_name || 'User'}</span>
            {isAdmin && <span className="text-xs text-amber-300 font-medium">Super Admin</span>}
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-stone-400 hover:text-white hover:bg-emerald-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden md:flex w-56 flex-col bg-emerald-900 text-stone-100 shrink-0">
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-[2000] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="relative w-64 max-w-[80vw] h-full bg-emerald-900 text-stone-100 flex flex-col shadow-xl animate-slide-in">
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}
