import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, Upload, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import LightboxDialog from '../ui/LightboxDialog'
import { useShare } from '../../lib/share'

const INTERVAL_MS = 5000

export default function CabinPhotoCarousel({ photos, isAdmin, onUpload, onDelete }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const { share } = useShare()
  const timerRef = useRef(null)

  const go = useCallback((dir) => {
    setCurrent(prev => (prev + dir + photos.length) % photos.length)
  }, [photos.length])

  useEffect(() => {
    if (paused || photos.length <= 1) return
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
        className="relative group overflow-hidden rounded-lg"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-label="Room photos"
        aria-roledescription="carousel"
      >
        <button
          onClick={() => go(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => go(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          aria-label="Next photo"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => setLightbox(photos[current])}
          className="block w-full aspect-[4/3] relative"
          aria-label={`View ${photos[current].caption || 'photo'}`}
        >
          {photos.map((photo, i) => (
            <img
              key={photo.id}
              src={photo.url}
              alt={photo.caption || ''}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
          {photos[current].caption && (
            <span className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent text-[11px] text-white font-medium">
              {photos[current].caption}
            </span>
          )}
        </button>

        {isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(photos[current]) }}
            className="absolute top-1.5 right-1.5 z-10 bg-black/40 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            aria-label="Delete photo"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        )}

        {photos.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10" role="tablist">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${i === current ? 'bg-white w-3 h-1.5' : 'bg-white/50 w-1.5 h-1.5 hover:bg-white/75'}`}
                role="tab"
                aria-selected={i === current}
                aria-label={`Go to ${photo.caption || `photo ${i + 1}`}`}
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
