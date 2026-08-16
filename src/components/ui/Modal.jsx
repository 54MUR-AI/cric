import { useFocusTrap } from './useFocusTrap'
import ModalOverlay from './ModalOverlay'

export default function Modal({ open, onClose, children, className = '', overlayClass = 'z-50', role = 'dialog', label }) {
  const trapRef = useFocusTrap(open)

  if (!open) return null
  return (
    <ModalOverlay onClose={onClose} overlayClass={overlayClass} ariaLabel={label} role={role}>
      <div ref={trapRef} className={className}>
        {children}
      </div>
    </ModalOverlay>
  )
}
