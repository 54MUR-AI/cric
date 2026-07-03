import { useState, useEffect } from 'react'
import { usePhotos } from '../hooks/usePhotos'

function groupByDate(photos) {
  const groups = {}
  for (const p of photos) {
    const d = p.taken_at ? new Date(p.taken_at) : new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = { date: d, photos: [] }
    groups[key].photos.push(p)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function PhotosPage() {
  const { photos, loading, uploadPhoto, deletePhoto, refresh } = usePhotos()
  const [groups, setGroups] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { setGroups(groupByDate(photos)) }, [photos])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { await uploadPhoto(file) } catch {} finally { setUploading(false); e.target.value = '' }
  }

  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return <div className="text-stone-400 text-sm p-4">Loading photos...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Photos</h1>
          <p className="text-sm text-stone-400">Share and browse camp memories</p>
        </div>
        <label className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs cursor-pointer transition-colors ${uploading ? 'bg-stone-800 text-white border-stone-800 opacity-50' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-400'}`}>
          <span className="text-lg leading-none">+</span>
          {uploading ? 'Uploading...' : 'Upload Photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-5xl mb-3">📷</p>
          <p className="font-medium">No photos yet</p>
          <p className="text-sm">Upload the first camp memory!</p>
        </div>
      )}

      {groups.map(([key, group]) => (
        <div key={key}>
          <h2 className="text-sm font-semibold text-stone-500 mb-2 sticky top-0 bg-stone-50 py-2 z-10">{formatDate(group.date)}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {group.photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-stone-100 cursor-pointer" onClick={() => setLightbox(photo)}>
                <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{photo.caption}</p>
                  </div>
                )}
                <button onClick={(e) => { e.stopPropagation(); deletePhoto(photo) }} className="absolute top-1 right-1 bg-white/80 hover:bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || ''} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
            {lightbox.caption && <p className="text-white text-sm mt-2 text-center">{lightbox.caption}</p>}
            <button onClick={() => setLightbox(null)} className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}