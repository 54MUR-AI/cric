import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Wrench, FileText, Home, Users, BookOpen, ScrollText, Image, LogOut, X, Moon, Sun, Ship, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '../../lib/constants'
import { useAuth } from '../../hooks/useAuth'
import { useDarkMode } from '../../lib/useDarkMode'
import { useOfficers } from '../../lib/OfficersContext'

const iconMap = { LayoutDashboard, Calendar, Wrench, FileText, Home, Users, BookOpen, ScrollText, Image, Ship, AlertTriangle }

function DarkModeToggle({ collapsed }) {
  const { dark, toggle } = useDarkMode()
  return (
    <div className={`${collapsed ? 'px-2' : 'px-4'} py-2 border-t border-emerald-800`}>
      <button onClick={toggle} title={collapsed ? (dark ? 'Light Mode' : 'Dark Mode') : undefined} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-300 hover:bg-emerald-800 hover:text-white transition-colors ${collapsed ? 'justify-center px-0' : ''}`}>
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {!collapsed && (dark ? 'Light Mode' : 'Dark Mode')}
      </button>
    </div>
  )
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed }) {
  const { profile, isAdmin, signOut } = useAuth()
  const { officers } = useOfficers()
  const [officersOpen, setOfficersOpen] = useState(false)
  const [drawerCollapsed, setDrawerCollapsed] = useState(true)

  const buildNav = (isCollapsed, showClose, onToggle) => (
    <>
      <div className={`flex items-center justify-between border-b border-emerald-800 py-5 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <div className={`flex items-center gap-2 min-w-0 ${isCollapsed ? 'mx-auto' : ''}`}>
          <img src={`${import.meta.env.BASE_URL}icons/icon-32x32.png`} alt="CRIC" className="h-6 w-6" />
          {!isCollapsed && <span className="font-semibold text-sm">CRIC Manager</span>}
        </div>
        {showClose && (
          <button onClick={onClose} className="md:hidden p-1 text-stone-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
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
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md py-2 text-sm transition-colors ${
                  isCollapsed ? 'justify-center px-0' : 'px-3'
                } ${isActive ? 'bg-emerald-800 text-white' : 'text-stone-300 hover:bg-emerald-800 hover:text-white'}`
              }
            >
              {Icon && <Icon className="h-4 w-4" />}
              {!isCollapsed && item.label}
            </NavLink>
          )
        })}
        {isAdmin && (
          <>
            {!isCollapsed && <div className="pt-3 pb-1 px-3 text-xs font-medium text-emerald-500 uppercase tracking-wider">Admin</div>}
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon]
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md py-2 text-sm transition-colors ${
                      isCollapsed ? 'justify-center px-0' : 'px-3'
                    } ${isActive ? 'bg-emerald-800 text-white' : 'text-stone-300 hover:bg-emerald-800 hover:text-white'}`
                  }
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {!isCollapsed && item.label}
                </NavLink>
              )
            })}
          </>
        )}
      </nav>

      <DarkModeToggle collapsed={isCollapsed} />

      <div className="border-t border-emerald-800 px-2 py-3">
        <div className={`flex items-center gap-2 mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-medium shrink-0">
            {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <span className="text-sm truncate block">{profile?.display_name || 'User'}</span>
              {isAdmin && <span className="text-xs text-amber-300 font-medium">Super Admin</span>}
            </div>
          )}
        </div>
        {!isCollapsed && officers.length > 0 && (
          <div className="mb-2 pt-2 border-t border-emerald-800">
            <button onClick={() => setOfficersOpen(o => !o)} className="flex w-full items-center gap-1 px-2 mb-1 text-xs text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
              <ChevronDown className={`h-3 w-3 transition-transform ${officersOpen ? '' : '-rotate-90'}`} />
              Board of Directors
            </button>
            {officersOpen && officers.map(o => (
              <div key={o.id} className="flex items-center gap-2 px-2 py-0.5 text-xs text-stone-400">
                <span className="font-medium text-stone-300">{o.profile?.display_name}</span>
                <span>— {o.title}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={signOut}
          title={isCollapsed ? 'Sign out' : undefined}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-stone-400 hover:text-white hover:bg-emerald-800 transition-colors ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && 'Sign out'}
        </button>
      </div>

      <div className="border-t border-emerald-800 p-2">
        <button
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="flex w-full items-center justify-center rounded-md py-2 text-stone-300 hover:bg-emerald-800 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className={`hidden md:flex ${collapsed ? 'w-16' : 'w-56'} flex-col bg-emerald-900 text-stone-100 shrink-0 transition-[width] duration-200`}>
        {buildNav(collapsed, false, onToggleCollapsed)}
      </aside>
      {open && (
        <div className="fixed inset-0 z-[2000] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className={`relative ${drawerCollapsed ? 'w-16' : 'w-64'} max-w-[80vw] h-full bg-emerald-900 text-stone-100 flex flex-col shadow-xl animate-slide-in`}>
            {buildNav(drawerCollapsed, true, () => setDrawerCollapsed(c => !c))}
          </aside>
        </div>
      )}
    </>
  )
}
