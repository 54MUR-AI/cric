import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, Upload, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import LightboxDialog from '../ui/LightboxDialog'
import { useShare } from '../../lib/share'

const INTERVAL_MS = 4000

export default function CabinPhotoCarousel({ photos, isAdmin, onUpload, onDelete }) {
  const [offset, setOffset] = useState(0)
  const [paused, setPaused] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const { share } = useShare()
  const timerRef = useRef(null)

  const visibleCount = 3

  const go = useCallback((dir) => {
    setOffset(prev => {
      const max = Math.max(0, photos.length - visibleCount)
      const next = prev + dir
      if (next < 0) return max
      if (next > max) return 0
      return next
    })
  }, [photos.length])

  useEffect(() => {
    if (paused || photos.length <= visibleCount) return
    timerRef.current = setInterval(() => go(1), INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [paused, go, photos.length])

  if (!photos.length) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide">Rooms</span>
        </div>
        <div className="rounded-lg border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center gap-1.5 py-4 text-center">
          <ImageIcon className="h-5 w-5 text-stone-300 dark:text-stone-600" />
          <p className="text-[11px] text-stone-400 dark:text-stone-500">No room photos yet</p>
          {isAdmin && (
            <button onClick={onUpload} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors">
              <Upload className="h-2.5 w-2.5" /> Upload
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide">Rooms ({photos.length})</span>
        {isAdmin && (
          <button onClick={onUpload} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors">
            <Upload className="h-2.5 w-2.5" /> Add
          </button>
        )}
      </div>

      <div
        className="relative group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {photos.length > visibleCount && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-0 top-0 bottom-0 w-7 z-10 bg-gradient-to-r from-white/80 dark:from-stone-900/80 to-transparent flex items-center justify-start pl-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous photos"
            >
              <ChevronLeft className="h-4 w-4 text-stone-600 dark:text-stone-300" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-0 top-0 bottom-0 w-7 z-10 bg-gradient-to-l from-white/80 dark:from-stone-900/80 to-transparent flex items-center justify-end pr-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next photos"
            >
              <ChevronRight className="h-4 w-4 text-stone-600 dark:text-stone-300" />
            </button>
          </>
        )}

        <div className="flex gap-2 overflow-hidden">
          {photos.slice(offset, offset + visibleCount).map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="relative flex-1 min-w-0 group/thumb"
            >
              <img
                src={photo.url}
                alt={photo.caption || ''}
                className="w-full aspect-[4/3] object-cover rounded-lg ring-1 ring-stone-200 dark:ring-stone-700 hover:ring-2 hover:ring-blue-500 dark:hover:ring-blue-400 transition-all"
                loading="lazy"
              />
              {photo.caption && (
                <p className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg text-[10px] text-white font-medium truncate">{photo.caption}</p>
              )}
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(photo) }}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-2 w-2" />
                </button>
              )}
            </button>
          ))}
        </div>

        {photos.length > visibleCount && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {Array.from({ length: Math.ceil(photos.length / visibleCount) }, (_, i) => (
              <button
                key={i}
                onClick={() => setOffset(i * visibleCount)}
                className={`rounded-full transition-all ${Math.floor(offset / visibleCount) === i ? 'bg-stone-800 dark:bg-stone-200 w-3 h-1.5' : 'bg-stone-300 dark:bg-stone-600 w-1.5 h-1.5 hover:bg-stone-400 dark:hover:bg-stone-500'}`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <LightboxDialog photo={lightbox} photos={photos} onClose={() => setLightbox(null)} onNavigate={setLightbox} onShare={share} />
      )}
    </div>
  )
}
