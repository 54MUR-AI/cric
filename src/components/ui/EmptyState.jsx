import { Inbox, Ship, Wrench, Image, FileText, Calendar, AlertTriangle, ScrollText } from 'lucide-react'

const ICONS = {
  ship: Ship,
  wrench: Wrench,
  image: Image,
  fileText: FileText,
  inbox: Inbox,
  calendar: Calendar,
  alertTriangle: AlertTriangle,
  scrollText: ScrollText,
}

export default function EmptyState({ icon = 'inbox', title, description, action }) {
  const Icon = ICONS[icon] || Inbox
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-stone-100 dark:bg-stone-800 p-4">
        <Icon className="h-8 w-8 text-stone-400 dark:text-stone-500" />
      </div>
      <h3 className="text-base font-medium text-stone-600 dark:text-stone-400">{title}</h3>
      {description && <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
