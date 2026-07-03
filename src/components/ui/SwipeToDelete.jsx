import { useRef, useState, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { vibrate } from '../../lib/haptics'

export default function SwipeToDelete({ onDelete, children, className = '' }) {
  const [swiping, setSwiping] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef(0)
  const threshold = 80

  const handleTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX
    setSwiping(true)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!swiping) return
    const dx = e.touches[0].clientX - startX.current
    setOffsetX(Math.max(-120, Math.min(0, dx)))
  }, [swiping])

  const handleTouchEnd = useCallback(() => {
    setSwiping(false)
    if (offsetX < -threshold) {
      vibrate([10, 20, 10])
      onDelete()
    }
    setOffsetX(0)
  }, [offsetX, onDelete])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-y-0 right-0 flex items-center bg-rose-500 text-white px-4 rounded-md">
        <Trash2 className="h-5 w-5" />
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-inherit transition-transform duration-200 ease-out cursor-pointer touch-pan-y"
        style={{ transform: swiping ? `translateX(${offsetX}px)` : 'translateX(0)' }}
      >
        {children}
      </div>
    </div>
  )
}
