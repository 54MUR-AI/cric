import { useState, useEffect, useCallback } from 'react'
import { supabase, SUPABASE_FUNCTIONS_URL, getAccessToken } from '../lib/supabase'
import exifr from 'exifr'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'
import { resizeImage } from '../lib/resizeImage'

interface Photo {
  id: string
  storage_path: string
  url: string
  caption?: string
  taken_at?: string
  latitude?: number
  longitude?: number
  album_id?: string
  cabin_id?: string
  uploaded_by?: string
  created_at?: string
}

interface Album {
  id: string
  name: string
  description?: string
  created_at?: string
}

interface ExifData {
  takenAt?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface UploadOptions {
  caption?: string
  album_id?: string
  cabin_id?: string
  exif?: ExifData
}

const FUNCTIONS_URL = SUPABASE_FUNCTIONS_URL

async function uploadPhotoCore(file: File, { caption, album_id, cabin_id, exif: exifData }: UploadOptions = {}): Promise<Photo> {
  let takenAt: string | null = null; let latitude: number | null = null; let longitude: number | null = null
  if (exifData) {
    takenAt = exifData.takenAt ?? null
    latitude = exifData.latitude ?? null
    longitude = exifData.longitude ?? null
  } else {
    try {
      const exif = await exifr.parse(file, ['DateTimeOriginal', 'latitude', 'longitude'])
      if (exif?.DateTimeOriginal) takenAt = exif.DateTimeOriginal.toISOString()
      if (Number.isFinite(exif?.latitude) && Number.isFinite(exif?.longitude)) {
        latitude = exif.latitude; longitude = exif.longitude
      }
    } catch {}
  }

  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const formData = new FormData()
  formData.append('file', file)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  let uploadResult: { storage_path: string; url: string; backend: string }
  try {
    const res = await fetch(`${FUNCTIONS_URL}/photo-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    uploadResult = await res.json()
  } catch (err) {
    console.error('Photo upload failed', err)
    throw err
  } finally {
    clearTimeout(timeout)
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('photos')
    .insert({
      storage_path: uploadResult.storage_path,
      url: uploadResult.url,
      caption: caption || null,
      taken_at: takenAt,
      latitude, longitude,
      album_id: album_id || null,
      cabin_id: cabin_id || null,
      uploaded_by: user?.id,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Photo DB insert failed; file may be orphaned on storage', error)
    throw error
  }

  return data
}

async function deletePhotoCore(photo: Photo): Promise<void> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${FUNCTIONS_URL}/photo-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ photoId: photo.id, storagePath: photo.storage_path }),
  })
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}))
    throw new Error((errJson as any).error || `Delete failed: ${res.status}`)
  }
}

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const fetchAll = useCallback(async () => {
    // Seed from cache first for instant/offline render
    try {
      const [cachedPhotos, cachedAlbums] = await Promise.all([
        db.photos.orderBy('taken_at').reverse().toArray(),
        db.photo_albums.orderBy('name').toArray(),
      ])
      if (cachedPhotos.length) setPhotos(cachedPhotos)
      if (cachedAlbums.length) setAlbums(cachedAlbums)
    } catch (err) {
      console.warn('Failed to read photos from cache', err)
    }

    try {
      const [photosRes, albumsRes] = await Promise.all([
        supabase.from('photos').select('*').order('taken_at', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('photo_albums').select('*').order('name'),
      ])
      if (!photosRes.error) { setPhotos(photosRes.data || []); db.photos.bulkPut(photosRes.data || []) }
      if (!albumsRes.error) { setAlbums(albumsRes.data || []); db.photo_albums.bulkPut(albumsRes.data || []) }
    } catch (err) {
      console.warn('Failed to load photos from network', err)
      if (photos.length === 0) toast.error('Could not load photos')
    } finally {
      setLoading(false)
    }
  }, [photos.length, toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const uploadPhoto = useCallback(async (file: File, options: UploadOptions = {}): Promise<Photo> => {
    const data = await uploadPhotoCore(file, options)
    setPhotos(prev => [data, ...prev])
    db.photos.put(data)
    toast.success('Photo uploaded')
    return data
  }, [toast])

  const deleteAlbum = useCallback(async (albumId: string) => {
    try {
      const { error } = await supabase.from('photo_albums').delete().eq('id', albumId)
      if (error) throw error
      setAlbums(prev => prev.filter(a => a.id !== albumId))
      setPhotos(prev => prev.map(p => p.album_id === albumId ? { ...p, album_id: undefined } : p))
      db.photo_albums.delete(albumId)
      db.photos.where('album_id').equals(albumId).modify({ album_id: undefined })
      toast.info('Album deleted')
    } catch (err) {
      console.error('Failed to delete album', err)
      toast.error('Failed to delete album')
    }
  }, [toast])

  const deletePhoto = useCallback(async (photo: Photo) => {
    try {
      await deletePhotoCore(photo)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      db.photos.delete(photo.id)
      toast.info('Photo deleted')
    } catch (err) {
      console.error('Failed to delete photo', err)
      toast.error('Failed to delete photo')
    }
  }, [toast])

  return { photos, albums, loading, uploadPhoto, deletePhoto, deleteAlbum, refresh: fetchAll }
}

export function useCabinPhotos(cabinIds: string[]) {
  const toast = useToast()
  const [photosByCabin, setPhotosByCabin] = useState<Record<string, Photo[]>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const apply = useCallback((rows: Photo[]) => {
    const grouped: Record<string, Photo[]> = {}
    for (const p of rows) {
      if (!p.cabin_id) continue
      if (!grouped[p.cabin_id]) grouped[p.cabin_id] = []
      grouped[p.cabin_id].push(p)
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    }
    setPhotosByCabin(grouped)
  }, [])

  const cabinIdsKey = cabinIds.join(',')

  const fetchCabinPhotos = useCallback(async () => {
    const ids = cabinIdsKey ? cabinIdsKey.split(',') : []
    if (!ids.length) { setLoading(false); return }
    try {
      const cached = await db.photos.where('cabin_id').anyOf(ids).toArray()
      if (cached.length) apply(cached)
    } catch (err) {
      console.warn('Failed to read cabin photos from cache', err)
    }
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .in('cabin_id', ids)
        .order('created_at', { ascending: true })
      if (!error && data) {
        db.photos.bulkPut(data)
        apply(data)
      }
    } catch (err) {
      console.warn('Failed to load cabin photos from network', err)
    }
    setLoading(false)
  }, [cabinIdsKey, apply])

  useEffect(() => { fetchCabinPhotos() }, [fetchCabinPhotos])

  const replaceCabinPhotos = useCallback(async (cabinId: string, files: File[], captions: (string | null)[]) => {
    setUploading(true)
    setProgress(5)
    const oldPhotos = photosByCabin[cabinId] || []
    let done = 0
    const total = files.length + oldPhotos.length
    const uploaded: Photo[] = []
    try {
      // Upload the new set first, then remove the previous year's photos
      for (let i = 0; i < files.length; i++) {
        const optimized = await resizeImage(files[i])
        const photo = await uploadPhotoCore(optimized, {
          cabin_id: cabinId,
          caption: captions[i] || undefined,
        })
        uploaded.push(photo)
        db.photos.put(photo)
        done++
        setProgress(Math.round((done / total) * 90))
      }
      for (const old of oldPhotos) {
        await deletePhotoCore(old)
        db.photos.delete(old.id)
        done++
        setProgress(Math.round((done / total) * 100))
      }
      setPhotosByCabin(prev => ({ ...prev, [cabinId]: uploaded }))
      toast.success(`Uploaded ${uploaded.length} photo${uploaded.length === 1 ? '' : 's'}`)
      return uploaded
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [photosByCabin, toast])

  const deleteCabinPhoto = useCallback(async (photo: Photo) => {
    try {
      await deletePhotoCore(photo)
      db.photos.delete(photo.id)
      setPhotosByCabin(prev => ({
        ...prev,
        [photo.cabin_id || '']: (prev[photo.cabin_id || ''] || []).filter(p => p.id !== photo.id),
      }))
      toast.info('Photo deleted')
    } catch (err) {
      console.error('Failed to delete photo', err)
      toast.error('Failed to delete photo')
    }
  }, [toast])

  return { photosByCabin, loading, uploading, progress, replaceCabinPhotos, deleteCabinPhoto, refresh: fetchCabinPhotos }
}
