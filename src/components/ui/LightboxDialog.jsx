import { useEffect, useCallback } from 'react'
import { Share2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { vibrate } from '../../lib/haptics'

export default function LightboxDialog({ photo, photos, onClose, onNavigate, onShare }) {
  const currentIndex = photos.findIndex(p => p.id === photo.id)

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(photos[currentIndex - 1])
  }, [currentIndex, photos, onNavigate])

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) onNavigate(photos[currentIndex + 1])
  }, [currentIndex, photos, onNavigate])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, goPrev, goNext])

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-label="Photo lightbox">
      <div className="relative max-w-4xl max-h-full flex items-center" onClick={e => e.stopPropagation()}>
        {/* Previous button */}
        {currentIndex > 0 && (
          <button onClick={goPrev} className="absolute left-0 z-10 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center -ml-14 transition-colors" aria-label="Previous photo">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Photo */}
        <div className="text-center">
          <img src={photo.url} alt={photo.caption || ''} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
          {photo.caption && <p className="text-white text-sm mt-2">{photo.caption}</p>}
          <div className="flex justify-center gap-3 mt-2">
            <button onClick={() => onShare({ title: 'CRIC Photo', text: photo.caption || 'Camp memory', url: photo.url })} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
              <Share2 className="h-3 w-3" /> Share
            </button>
            <button onClick={() => { navigator.clipboard.writeText(photo.url); vibrate(8) }} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
              Copy Link
            </button>
            <span className="text-xs text-white/50">{currentIndex + 1} / {photos.length}</span>
          </div>
        </div>

        {/* Next button */}
        {currentIndex < photos.length - 1 && (
          <button onClick={goNext} className="absolute right-0 z-10 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center -mr-14 transition-colors" aria-label="Next photo">
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Close button */}
        <button onClick={onClose} className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg" aria-label="Close lightbox">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
