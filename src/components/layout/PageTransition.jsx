import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

export default function PageTransition() {
  const location = useLocation()
  const fm = useRef(null)

  useEffect(() => {
    let live = true
    import('framer-motion').then((mod) => {
      if (live) fm.current = mod
    })
    return () => { live = false }
  }, [])

  const motion = fm.current?.motion
  const AnimatePresence = fm.current?.AnimatePresence
  if (!motion || !AnimatePresence) {
    return (
      <div key={location.pathname} className="page-in">
        <Outlet />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
