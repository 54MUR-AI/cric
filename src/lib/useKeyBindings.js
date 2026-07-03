import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const BINDINGS = {
  'g+d': '/',
  'g+s': '/schedule',
  'g+m': '/map',
  'g+g': '/guide',
  'g+r': '/records',
  'g+w': '/maintenance',
  'g+t': '/meetings',
  'g+c': '/cabins',
  'g+p': '/photos',
  'g+u': '/users',
}

export function useKeyBindings() {
  const navigate = useNavigate()

  useEffect(() => {
    let buffer = ''
    let timer

    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return

      if (e.key === '?') {
        const key = Object.keys(BINDINGS)
        const helpText = key.map(k => `${k}: ${BINDINGS[k] === '/' ? 'Dashboard' : BINDINGS[k].slice(1).replace(/^\w/, c => c.toUpperCase())}`)
        alert(`Keyboard Shortcuts:\n${helpText.join('\n')}\n\n? - Show this help`)
        return
      }

      buffer += e.key.toLowerCase()
      clearTimeout(timer)
      timer = setTimeout(() => { buffer = '' }, 1000)

      const combo = buffer.match(/^g$/) ? null : buffer
      if (combo && BINDINGS[combo]) {
        navigate(BINDINGS[combo])
        buffer = ''
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}
