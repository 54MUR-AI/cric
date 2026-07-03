import { useState, useEffect } from 'react'
import { Share2, FolderOpen, Plus, X } from 'lucide-react'
import { usePhotos } from '../hooks/usePhotos'
import { useShare } from '../lib/share'
import { supabase } from '../lib/supabase'

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
  const { photos, albums, loading, uploadPhoto, deletePhoto, refresh } = usePhotos()
  const { copy, share } = useShare()
  const [groups, setGroups] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [albumFilter, setAlbumFilter] = useState(null)
  const [showAlbumForm, setShowAlbumForm] = useState(false)
  const [albumName, setAlbumName] = useState('')

  const filtered = albumFilter ? photos.filter(p => p.album_id === albumFilter) : photos
  useEffect(() => { setGroups(groupByDate(filtered)) }, [filtered])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { await uploadPhoto(file, { album_id: albumFilter }) } catch {} finally { setUploading(false); e.target.value = '' }
  }

  const handleCreateAlbum = async () => {
    if (!albumName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('photo_albums').insert({ name: albumName.trim(), created_by: user?.id })
    setAlbumName(''); setShowAlbumForm(false); refresh()
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
        <div className="flex gap-2">
          <button onClick={() => setShowAlbumForm(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs bg-white text-stone-600 border-stone-300 hover:border-stone-400 transition-colors">
            <Plus className="h-3 w-3" /> Album
          </button>
          <label className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs cursor-pointer transition-colors ${uploading ? 'bg-stone-800 text-white border-stone-800 opacity-50' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-400'}`}>
            <span className="text-lg leading-none">+</span>
            {uploading ? 'Uploading...' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {albums.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setAlbumFilter(null)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${!albumFilter ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}>
            <FolderOpen className="h-3 w-3" /> All
          </button>
          {albums.map(a => (
            <button key={a.id} onClick={() => setAlbumFilter(a.id)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${albumFilter === a.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}>
              <FolderOpen className="h-3 w-3" />{a.name}
            </button>
          ))}
        </div>
      )}

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
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); share({ title: 'CRIC Photo', text: photo.caption || 'Camp memory', url: photo.url }) }} className="bg-white/80 hover:bg-white rounded-full w-6 h-6 flex items-center justify-center text-stone-600">
                    <Share2 className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deletePhoto(photo) }} className="bg-white/80 hover:bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs text-stone-600">✕</button>
                </div>
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
            <div className="flex justify-center mt-2">
              <button onClick={() => share({ title: 'CRIC Photo', text: lightbox.caption || 'Camp memory', url: lightbox.url })} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
                <Share2 className="h-3 w-3" /> Share
              </button>
            </div>
            <button onClick={() => setLightbox(null)} className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg">✕</button>
          </div>
        </div>
      )}

      {showAlbumForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowAlbumForm(false)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">New Album</h3>
              <button onClick={() => setShowAlbumForm(false)}><X className="h-4 w-4 text-stone-400" /></button>
            </div>
            <input type="text" placeholder="Album name" value={albumName} onChange={e => setAlbumName(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-stone-400" autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAlbumForm(false)} className="rounded-md px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 border border-stone-300">Cancel</button>
              <button onClick={handleCreateAlbum} className="rounded-md px-3 py-1.5 text-xs text-white bg-stone-800 hover:bg-stone-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
