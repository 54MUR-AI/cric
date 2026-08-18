import { useState, useRef } from 'react'
import { Trash2, Upload, Image as ImageIcon, ChevronRight } from 'lucide-react'
import LightboxDialog from '../ui/LightboxDialog'
import { useShare } from '../../lib/share'

export default function CabinPhotoCarousel({ photos, isAdmin, onUpload, onDelete }) {
  const [lightbox, setLightbox] = useState(null)
  const { share } = useShare()
  const scrollRef = useRef(null)

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

      <div className="relative group">
        <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {photos.map((photo, j) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="relative shrink-0 group/thumb"
            >
              <img
                src={photo.url}
                alt={photo.caption || ''}
                className="w-20 h-16 sm:w-24 sm:h-20 object-cover rounded-md ring-1 ring-stone-200 dark:ring-stone-700 hover:ring-2 hover:ring-blue-500 dark:hover:ring-blue-400 transition-all"
                loading="lazy"
              />
              {photo.caption && (
                <p className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-gradient-to-t from-black/70 to-transparent rounded-b-md text-[9px] text-white truncate">{photo.caption}</p>
              )}
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(photo) }}
                  className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-2 w-2" />
                </button>
              )}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={onUpload}
              className="shrink-0 w-20 h-16 sm:w-24 sm:h-20 rounded-md border-2 border-dashed border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 flex flex-col items-center justify-center gap-0.5 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
            >
              <Upload className="h-3 w-3" />
              <span className="text-[9px]">Add</span>
            </button>
          )}
        </div>
        {photos.length > 3 && (
          <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white dark:from-stone-900 to-transparent pointer-events-none flex items-center justify-end pr-1">
            <ChevronRight className="h-3 w-3 text-stone-400" />
          </div>
        )}
      </div>

      {lightbox && (
        <LightboxDialog photo={lightbox} photos={photos} onClose={() => setLightbox(null)} onNavigate={setLightbox} onShare={share} />
      )}
    </div>
  )
}
