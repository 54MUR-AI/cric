import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const KEY_BINDINGS = [
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

const BINDINGS_MAP = Object.fromEntries(KEY_BINDINGS.map(b => [b.combo, '/'.concat(b.label.toLowerCase().replace(/ /g, ''))]))
BINDINGS_MAP['g+d'] = '/'

export function useKeyBindings(onShowHelp) {
  const navigate = useNavigate()

  useEffect(() => {
    let buffer = ''
    let timer

    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return

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
