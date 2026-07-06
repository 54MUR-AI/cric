interface NavItem {
  to: string
  label: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/schedule', label: 'Schedule', icon: 'Calendar' },
  { to: '/emergency', label: 'Emergency', icon: 'AlertTriangle' },
  { to: '/cabins', label: 'Cabins', icon: 'Home' },
  { to: '/guide', label: 'Guide', icon: 'BookOpen' },
  { to: '/maintenance', label: 'Maintenance', icon: 'Wrench' },
  { to: '/meetings', label: 'Meetings', icon: 'FileText' },
  { to: '/records', label: 'Records', icon: 'ScrollText' },
  { to: '/photos', label: 'Photos', icon: 'Image' },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/users', label: 'Manage Users', icon: 'Users' },
]

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}
