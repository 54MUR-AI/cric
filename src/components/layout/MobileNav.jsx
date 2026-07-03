import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Calendar, Map, BookOpen, Image } from 'lucide-react'

const ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/guide', label: 'Guide', icon: BookOpen },
  { to: '/photos', label: 'Photos', icon: Image },
]

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-stone-200 safe-area-bottom">
      <div className="flex">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-emerald-700' : 'text-stone-400 hover:text-stone-600'
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
