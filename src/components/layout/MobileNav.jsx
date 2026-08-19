import { NavLink } from 'react-router-dom'
import { Map, Home, LayoutDashboard, Image, AlertTriangle } from 'lucide-react'

const ITEMS = [
  { to: '/map', label: 'Map', icon: Map },
  { to: '/cabins', label: 'Cabins', icon: Home },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/photos', label: 'Photos', icon: Image },
  { to: '/emergency', label: 'Emergency', icon: AlertTriangle, danger: true },
]

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 safe-area-bottom">
      <div className="flex">
        {ITEMS.map(({ to, label, icon: Icon, danger }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? danger
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
