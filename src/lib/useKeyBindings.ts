import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface KeyBinding {
  combo: string
  label: string
}

export const KEY_BINDINGS: KeyBinding[] = [
  { combo: 'g+d', label: 'Dashboard' },
  { combo: 'g+s', label: 'Schedule' },
  { combo: 'g+m', label: 'Map' },
  { combo: 'g+g', label: 'Guide' },
  { combo: 'g+r', label: 'Records' },
  { combo: 'g+w', label: 'Maintenance' },
  { combo: 'g+t', label: 'Meetings' },
  { combo: 'g+c', label: 'Cabins' },
  { combo: 'g+p', label: 'Photos' },
  { combo: 'g+u', label: 'Users' },
]

const BINDINGS_MAP: Record<string, string> = Object.fromEntries(KEY_BINDINGS.map(b => [b.combo, '/'.concat(b.label.toLowerCase().replace(/ /g, ''))]))
BINDINGS_MAP['g+d'] = '/'

export function useKeyBindings(onShowHelp?: () => void) {
  const navigate = useNavigate()

  useEffect(() => {
    let buffer = ''
    let timer: ReturnType<typeof setTimeout>

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.key === '?' && onShowHelp) {
        onShowHelp()
        return
      }

      buffer += e.key.toLowerCase()
      clearTimeout(timer)
      timer = setTimeout(() => { buffer = '' }, 1000)

      const combo = buffer.match(/^g$/) ? null : buffer
      if (combo && BINDINGS_MAP[combo]) {
        navigate(BINDINGS_MAP[combo])
        buffer = ''
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, onShowHelp])
}
