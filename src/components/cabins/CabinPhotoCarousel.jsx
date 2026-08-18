import { useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Upload, Image as ImageIcon } from 'lucide-react'
import LightboxDialog from '../ui/LightboxDialog'
import { useShare } from '../../lib/share'

export default function CabinPhotoCarousel({ photos, isAdmin, onUpload, onDelete }) {
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const { share } = useShare()

  if (!photos.length) {
    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Room Photos</span>
        </div>
        <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-600 flex flex-col items-center justify-center gap-2 py-6 text-center">
          <ImageIcon className="h-6 w-6 text-stone-300 dark:text-stone-600" />
          <p className="text-xs text-stone-400 dark:text-stone-500">No room photos yet.</p>
          {isAdmin && (
            <button onClick={onUpload} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors">
              <Upload className="h-3 w-3" /> Upload photos
            </button>
          )}
        </div>
      </div>
    )
  }

  const i = Math.min(index, photos.length - 1)
  const photo = photos[i]

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Room Photos</span>
        {isAdmin && (
          <button onClick={onUpload} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors">
            <Upload className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      <div className="relative rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
        <button onClick={() => setLightbox(photo)} className="block w-full" aria-label="View photo">
          <img src={photo.url} alt={photo.caption || ''} className="w-full aspect-[16/10] object-cover" loading="lazy" />
        </button>
        <span className="absolute bottom-2 right-2 rounded-full bg-black/50 text-white text-[10px] px-2 py-0.5">{i + 1} / {photos.length}</span>
        {isAdmin && (
          <button onClick={() => onDelete(photo)} className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors" aria-label="Delete photo">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {i > 0 && (
          <button onClick={() => setIndex(i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors" aria-label="Previous photo">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {i < photos.length - 1 && (
          <button onClick={() => setIndex(i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors" aria-label="Next photo">
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {photo.caption && <p className="mt-1 text-center text-xs text-stone-500 dark:text-stone-400 truncate">{photo.caption}</p>}

      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {photos.map((p, j) => (
            <button key={p.id} onClick={() => setIndex(j)} className={`h-1.5 rounded-full transition-all ${j === i ? 'w-4 bg-stone-800 dark:bg-stone-200' : 'w-1.5 bg-stone-300 dark:bg-stone-600'}`} aria-label={`Go to photo ${j + 1}`} />
          ))}
        </div>
      )}

      {lightbox && (
        <LightboxDialog photo={lightbox} photos={photos} onClose={() => setLightbox(null)} onNavigate={setLightbox} onShare={share} />
      )}
    </div>
  )
}
