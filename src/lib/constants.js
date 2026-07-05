export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/schedule', label: 'Schedule', icon: 'Calendar' },
  { to: '/guide', label: 'Guide', icon: 'BookOpen' },
  { to: '/emergency', label: 'Emergency', icon: 'AlertTriangle' },
  { to: '/records', label: 'Records', icon: 'ScrollText' },
  { to: '/maintenance', label: 'Maintenance', icon: 'Wrench' },
  { to: '/meetings', label: 'Meetings', icon: 'FileText' },
  { to: '/cabins', label: 'Cabins', icon: 'Home' },
  { to: '/photos', label: 'Photos', icon: 'Image' },
]

export const ADMIN_NAV_ITEMS = [
  { to: '/users', label: 'Manage Users', icon: 'Users' },
]

export const TASK_STATUSES = ['todo', 'in_progress', 'done']

export const TASK_STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}
