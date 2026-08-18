import { useState, useEffect, useRef, useCallback } from 'react'
import { Share2, FolderOpen, Plus, X, Upload, Trash2, Download } from 'lucide-react'
import { usePhotos } from '../hooks/usePhotos'
import { useShare } from '../lib/share'
import { useConfirm } from '../components/ui/useConfirm'
import { useEscapeKey } from '../components/ui/useEscapeKey'
import ModalOverlay from '../components/ui/ModalOverlay'
import { resizeImage } from '../lib/resizeImage'
import { vibrate } from '../lib/haptics'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import exifr from 'exifr'
import LightboxDialog from '../components/ui/LightboxDialog'

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
  const { photos, albums, loading, uploadPhoto, deletePhoto, deleteAlbum, refresh } = usePhotos()
  const { user, isAdmin } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()
  const { copy, share } = useShare()
  const [groups, setGroups] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [albumFilter, setAlbumFilter] = useState(null)
  const [showAlbumForm, setShowAlbumForm] = useState(false)
  const [albumName, setAlbumName] = useState('')
  const [targetAlbumId, setTargetAlbumId] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const fileRef = useRef()
  const dropRef = useRef()

  const filtered = albumFilter ? photos.filter(p => p.album_id === albumFilter) : photos
  useEffect(() => { setGroups(groupByDate(filtered)) }, [filtered])

  const [showUpload, setShowUpload] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadAlbumId, setUploadAlbumId] = useState(albumFilter || '')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 })
  const uploadPreview = uploadFiles.length === 1 ? URL.createObjectURL(uploadFiles[0]) : null

  useEscapeKey(() => setLightbox(null), !!lightbox)
  useEscapeKey(() => { if (!uploading) { setShowUpload(false) } }, showUpload)
  useEscapeKey(() => setShowAlbumForm(false), showAlbumForm)

  const doUpload = useCallback(async () => {
    if (!uploadFiles.length) return
    setUploading(true)
    setUploadProgress(0)
    setUploadCount({ done: 0, total: uploadFiles.length })
    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const f = uploadFiles[i]
        setUploadCount(prev => ({ ...prev, done: i }))
        setUploadProgress(Math.round((i / uploadFiles.length) * 90))
        let exif
        try {
          const parsed = await exifr.parse(f, ['DateTimeOriginal', 'latitude', 'longitude'])
          exif = {
            takenAt: parsed?.DateTimeOriginal?.toISOString() ?? null,
            latitude: parsed?.latitude ?? null,
            longitude: parsed?.longitude ?? null,
          }
        } catch {}
        const optimized = await resizeImage(f)
        await uploadPhoto(optimized, { caption: uploadCaption || undefined, album_id: uploadAlbumId || undefined, exif })
      }
      setUploadProgress(100)
      setUploadCount(prev => ({ ...prev, done: prev.total }))
      vibrate([10, 20, 10])
      setTimeout(() => { setShowUpload(false); setUploadFiles([]); setUploadCaption(''); setUploadProgress(0); setUploadCount({ done: 0, total: 0 }) }, 400)
    } catch { setUploadProgress(0); setUploadCount({ done: 0, total: 0 }) } finally { setUploading(false) }
  }, [uploadPhoto, uploadFiles, uploadCaption, uploadAlbumId])

  const handleFilePick = (e) => { const files = Array.from(e.target.files || []); if (files.length) { setUploadFiles(files); setShowUpload(true) }; e.target.value = '' }
  const handleDrop = async (e) => { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length) { setUploadFiles(files); setShowUpload(true) } }

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearSelection = () => setSelected(new Set())
  const deleteSelected = async () => {
    const deletable = photos.filter(p => selected.has(p.id) && (isAdmin || p.uploaded_by === user?.id))
    if (deletable.length === 0) return
    if (!await confirm({ title: 'Delete Photos', message: `Delete ${deletable.length} photo${deletable.length > 1 ? 's' : ''}?` })) return
    for (const photo of deletable) {
      await deletePhoto(photo)
    }
    setSelected(new Set())
    vibrate([10, 20, 10])
  }

  const downloadSelected = async () => {
    const toDownload = photos.filter(p => selected.has(p.id))
    for (const photo of toDownload) {
      const a = document.createElement('a')
      a.href = photo.url
      a.download = photo.caption || photo.url.split('/').pop() || 'photo.jpg'
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  const handleAlbumAction = async () => {
    let albumId = targetAlbumId
    if (!albumId) {
      if (!albumName.trim()) return
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('photo_albums').insert({ name: albumName.trim(), created_by: user?.id }).select('id').single()
      if (error || !data) { setAlbumName(''); setTargetAlbumId(''); setShowAlbumForm(false); return }
      albumId = data.id
    }
    if (selected.size > 0) {
      await supabase.from('photos').update({ album_id: albumId }).in('id', [...selected])
      setSelected(new Set())
    }
    setAlbumName(''); setTargetAlbumId(''); setShowAlbumForm(false)
    refresh()
  }

  const handleDeleteAlbum = async (albumId, albumName) => {
    if (!await confirm({ title: 'Delete Album', message: `Delete "${albumName}"? Photos will be kept but removed from this album.` })) return
    if (albumFilter === albumId) setAlbumFilter(null)
    await deleteAlbum(albumId)
  }

  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return <div className="text-stone-400 dark:text-stone-500 text-sm p-4">Loading photos...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Photos</h1>
          <p className="text-sm text-stone-400 dark:text-stone-500">Share and browse camp memories</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-stone-500 dark:text-stone-400 self-center">{selected.size} selected</span>
              <button onClick={deleteSelected} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-800 transition-colors">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
              <button onClick={clearSelection} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500 transition-colors">Cancel</button>
            </>
          )}
          <button onClick={() => setShowAlbumForm(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500 transition-colors">
            <Plus className="h-3 w-3" /> Album
          </button>
          {selected.size === 0 ? (
            <label className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs cursor-pointer transition-colors bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500">
              <Upload className="h-3 w-3" /> Upload
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFilePick} />
            </label>
          ) : (
            <button onClick={downloadSelected} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500 transition-colors">
              <Download className="h-3 w-3" /> Download
            </button>
          )}
        </div>
      </div>

      {albums.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setAlbumFilter(null)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${!albumFilter ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 border-stone-800 dark:border-stone-200' : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500'}`}>
            <FolderOpen className="h-3 w-3" /> All
          </button>
          {albums.map(a => (
            <span key={a.id} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${albumFilter === a.id ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 border-stone-800 dark:border-stone-200' : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500'}`}>
              <button onClick={() => setAlbumFilter(a.id)} className="inline-flex items-center gap-1"><FolderOpen className="h-3 w-3" />{a.name}</button>
              <button onClick={() => handleDeleteAlbum(a.id, a.name)} className="ml-0.5 rounded-full hover:bg-stone-300/50 dark:hover:bg-stone-600/50 p-0.5 -mr-1" aria-label={`Delete ${a.name}`}><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
        </div>
      )}

      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative ${dragOver ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-2 dark:ring-offset-stone-900 rounded-lg' : ''}`}
      >
        {dragOver && (
          <div className="absolute inset-0 z-20 bg-emerald-50/90 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
            <div className="text-center text-emerald-700 dark:text-emerald-400">
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Drop photo to upload</p>
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <div className="text-center py-16 text-stone-400 dark:text-stone-500">
            <p className="text-5xl mb-3">📷</p>
            <p className="font-medium">No photos yet</p>
            <p className="text-sm">Drop a photo here or click Upload</p>
          </div>
        )}

        {groups.map(([key, group]) => (
          <div key={key}>
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2 sticky top-0 bg-stone-50 dark:bg-stone-950 py-2 z-10">{formatDate(group.date)}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {group.photos.map((photo) => {
                const isSelected = selected.has(photo.id)
                const canDelete = isAdmin || photo.uploaded_by === user?.id
                return (
                  <div key={photo.id} className={`relative group aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-pointer ${isSelected ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-1 dark:ring-offset-stone-900' : ''}`} onClick={() => { if (selected.size > 0 && canDelete) toggleSelect(photo.id); else setLightbox(photo) }}>
                    <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{photo.caption}</p>
                      </div>
                    )}
                    {canDelete && (
                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(photo.id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-stone-300 dark:border-stone-600 text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500 dark:focus:ring-emerald-400" />
                      </div>
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); share({ title: 'CRIC Photo', text: photo.caption || 'Camp memory', url: photo.url }) }} className="bg-white/80 hover:bg-white rounded-full w-6 h-6 flex items-center justify-center text-stone-600 dark:text-stone-400">
                        <Share2 className="h-3 w-3" />
                      </button>
                      {canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); deletePhoto(photo) }} className="bg-white/80 hover:bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs text-stone-600 dark:text-stone-400">✕</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <LightboxDialog
          photo={lightbox}
          photos={filtered}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
          onShare={share}
        />
      )}

      {showUpload && (
        <ModalOverlay onClose={() => { if (!uploading) { setShowUpload(false); setUploadFiles([]); setUploadCaption(''); setUploadProgress(0); setUploadCount({ done: 0, total: 0 }) }}} ariaLabel="Upload photos">
          <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800 dark:text-stone-200">{uploadFiles.length > 1 ? `Upload ${uploadFiles.length} Photos` : 'Upload Photo'}</h3>
              {!uploading && <button onClick={() => { setShowUpload(false); setUploadFiles([]); setUploadCaption(''); setUploadProgress(0); setUploadCount({ done: 0, total: 0 }) }} aria-label="Close"><X className="h-4 w-4 text-stone-400 dark:text-stone-500" /></button>}
            </div>
            {uploadPreview && (
              <img src={uploadPreview} alt="Preview" className="w-full aspect-video object-cover rounded-lg mb-4 bg-stone-100 dark:bg-stone-800" />
            )}
            {!uploadPreview && uploadFiles.length > 1 && (
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {uploadFiles.slice(0, 8).map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded object-cover bg-stone-100 dark:bg-stone-800 shrink-0" />
                ))}
                {uploadFiles.length > 8 && <span className="self-center text-xs text-stone-400 dark:text-stone-500 ml-1">+{uploadFiles.length - 8}</span>}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Caption (optional)</label>
                <input type="text" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="What's happening in this photo?" className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500" />
              </div>
              {albums.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Album</label>
                  <select value={uploadAlbumId} onChange={e => setUploadAlbumId(e.target.value)} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm">
                    <option value="">None</option>
                    {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              {uploading && (
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 text-right">{uploadCount.done} of {uploadCount.total}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setShowUpload(false); setUploadFiles([]); setUploadCaption(''); setUploadProgress(0); setUploadCount({ done: 0, total: 0 }) }} disabled={uploading} className="rounded-md px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-600 disabled:opacity-40">Cancel</button>
              <button onClick={doUpload} disabled={uploading || !uploadFiles.length} className="rounded-md px-4 py-1.5 text-xs text-white dark:text-stone-800 bg-stone-800 dark:bg-stone-200 hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-40">
                {uploading ? 'Uploading...' : uploadFiles.length > 1 ? `Upload ${uploadFiles.length}` : 'Upload'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {showAlbumForm && (
        <ModalOverlay onClose={() => { setShowAlbumForm(false); setTargetAlbumId(''); setAlbumName('') }} ariaLabel="Add to album">
          <div className="w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800 dark:text-stone-200">Add to Album</h3>
              <button onClick={() => { setShowAlbumForm(false); setTargetAlbumId(''); setAlbumName('') }} aria-label="Close"><X className="h-4 w-4 text-stone-400 dark:text-stone-500" /></button>
            </div>
            {selected.size > 0 && <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">{selected.size} photo{selected.size !== 1 ? 's' : ''} selected</p>}
            {selected.size > 0 && albums.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Existing album</label>
                <select value={targetAlbumId} onChange={e => { setTargetAlbumId(e.target.value); if (e.target.value) setAlbumName('') }} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200">
                  <option value="">— Select an album —</option>
                  {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{selected.size > 0 ? 'Or create a new album' : 'Album name'}</label>
              <input type="text" placeholder="New album name" value={albumName} onChange={e => { setAlbumName(e.target.value); if (e.target.value) setTargetAlbumId('') }} disabled={!!targetAlbumId} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAlbumForm(false); setTargetAlbumId(''); setAlbumName('') }} className="rounded-md px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-600">Cancel</button>
              <button onClick={handleAlbumAction} disabled={!targetAlbumId && !albumName.trim()} className="rounded-md px-4 py-1.5 text-xs text-white dark:text-stone-800 bg-stone-800 dark:bg-stone-200 hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-40">
                {selected.size > 0 ? (targetAlbumId ? 'Add to Album' : 'Create & Add') : 'Create'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
      {ConfirmDialog}
    </div>
  )
}
