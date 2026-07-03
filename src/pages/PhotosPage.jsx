import { useState, useEffect, useRef, useCallback } from 'react'
import { Share2, FolderOpen, Plus, X, Upload, Trash2 } from 'lucide-react'
import { usePhotos } from '../hooks/usePhotos'
import { useShare } from '../lib/share'
import { vibrate } from '../lib/haptics'
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
  const [dragOver, setDragOver] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const fileRef = useRef()
  const dropRef = useRef()

  const filtered = albumFilter ? photos.filter(p => p.album_id === albumFilter) : photos
  useEffect(() => { setGroups(groupByDate(filtered)) }, [filtered])

  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadAlbumId, setUploadAlbumId] = useState(albumFilter || '')
  const [uploadProgress, setUploadProgress] = useState(0)
  const uploadPreview = uploadFile ? URL.createObjectURL(uploadFile) : null

  const doUpload = useCallback(async () => {
    if (!uploadFile) return
    setUploading(true)
    setUploadProgress(10)
    const prog = setInterval(() => setUploadProgress(p => Math.min(p + 15, 85)), 400)
    try {
      await uploadPhoto(uploadFile, { caption: uploadCaption || undefined, album_id: uploadAlbumId || undefined })
      clearInterval(prog)
      setUploadProgress(100)
      vibrate([10, 20, 10])
      setTimeout(() => { setShowUpload(false); setUploadFile(null); setUploadCaption(''); setUploadProgress(0) }, 400)
    } catch { clearInterval(prog); setUploadProgress(0) } finally { setUploading(false) }
  }, [uploadPhoto, uploadFile, uploadCaption, uploadAlbumId])

  const handleFilePick = (e) => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setShowUpload(true) }; e.target.value = '' }
  const handleDrop = async (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); setShowUpload(true) } }

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearSelection = () => setSelected(new Set())
  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} photo${selected.size > 1 ? 's' : ''}?`)) return
    for (const id of selected) {
      const photo = photos.find(p => p.id === id)
      if (photo) await deletePhoto(photo)
    }
    setSelected(new Set())
    vibrate([10, 20, 10])
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
          {selected.size > 0 && (
            <>
              <span className="text-xs text-stone-500 self-center">{selected.size} selected</span>
              <button onClick={deleteSelected} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 transition-colors">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
              <button onClick={clearSelection} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs bg-white text-stone-600 border-stone-300 hover:border-stone-400 transition-colors">Cancel</button>
            </>
          )}
          <button onClick={() => setShowAlbumForm(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs bg-white text-stone-600 border-stone-300 hover:border-stone-400 transition-colors">
            <Plus className="h-3 w-3" /> Album
          </button>
          <label className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs cursor-pointer transition-colors bg-white text-stone-600 border-stone-300 hover:border-stone-400">
            <Upload className="h-3 w-3" /> Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
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

      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative ${dragOver ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-lg' : ''}`}
      >
        {dragOver && (
          <div className="absolute inset-0 z-20 bg-emerald-50/90 rounded-lg flex items-center justify-center">
            <div className="text-center text-emerald-700">
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Drop photo to upload</p>
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p className="text-5xl mb-3">📷</p>
            <p className="font-medium">No photos yet</p>
            <p className="text-sm">Drop a photo here or click Upload</p>
          </div>
        )}

        {groups.map(([key, group]) => (
          <div key={key}>
            <h2 className="text-sm font-semibold text-stone-500 mb-2 sticky top-0 bg-stone-50 py-2 z-10">{formatDate(group.date)}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {group.photos.map((photo) => {
                const isSelected = selected.has(photo.id)
                return (
                  <div key={photo.id} className={`relative group aspect-square rounded-lg overflow-hidden bg-stone-100 cursor-pointer ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`} onClick={() => { if (selected.size > 0) toggleSelect(photo.id); else setLightbox(photo) }}>
                    <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{photo.caption}</p>
                      </div>
                    )}
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(photo.id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
                    </div>
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); share({ title: 'CRIC Photo', text: photo.caption || 'Camp memory', url: photo.url }) }} className="bg-white/80 hover:bg-white rounded-full w-6 h-6 flex items-center justify-center text-stone-600">
                        <Share2 className="h-3 w-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deletePhoto(photo) }} className="bg-white/80 hover:bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs text-stone-600">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)} role="dialog" aria-label="Photo lightbox">
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || ''} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
            {lightbox.caption && <p className="text-white text-sm mt-2 text-center">{lightbox.caption}</p>}
            <div className="flex justify-center gap-3 mt-2">
              <button onClick={() => share({ title: 'CRIC Photo', text: lightbox.caption || 'Camp memory', url: lightbox.url })} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
                <Share2 className="h-3 w-3" /> Share
              </button>
              <button onClick={() => { navigator.clipboard.writeText(lightbox.url); vibrate(8) }} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
                Copy Link
              </button>
            </div>
            <button onClick={() => setLightbox(null)} className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg" aria-label="Close lightbox">✕</button>
          </div>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => { if (!uploading) { setShowUpload(false); setUploadFile(null); setUploadCaption(''); setUploadProgress(0) }}} role="dialog" aria-label="Upload photo">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">Upload Photo</h3>
              {!uploading && <button onClick={() => { setShowUpload(false); setUploadFile(null); setUploadCaption(''); setUploadProgress(0) }} aria-label="Close"><X className="h-4 w-4 text-stone-400" /></button>}
            </div>
            {uploadPreview && (
              <img src={uploadPreview} alt="Preview" className="w-full aspect-video object-cover rounded-lg mb-4 bg-stone-100" />
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Caption (optional)</label>
                <input type="text" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="What's happening in this photo?" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
              </div>
              {albums.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Album</label>
                  <select value={uploadAlbumId} onChange={e => setUploadAlbumId(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
                    <option value="">None</option>
                    {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              {uploading && (
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-600 transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-stone-400 text-right">{uploadProgress}%</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setShowUpload(false); setUploadFile(null); setUploadCaption(''); setUploadProgress(0) }} disabled={uploading} className="rounded-md px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 border border-stone-300 disabled:opacity-40">Cancel</button>
              <button onClick={doUpload} disabled={uploading || !uploadFile} className="rounded-md px-4 py-1.5 text-xs text-white bg-stone-800 hover:bg-stone-700 disabled:opacity-40">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlbumForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowAlbumForm(false)} role="dialog" aria-label="Create album">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">New Album</h3>
              <button onClick={() => setShowAlbumForm(false)} aria-label="Close"><X className="h-4 w-4 text-stone-400" /></button>
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
