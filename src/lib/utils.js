import { format, parseISO } from 'date-fns'

export function formatDate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
