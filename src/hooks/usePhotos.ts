import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import exifr from 'exifr'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'

interface Photo {
  id: string
  storage_path: string
  url: string
  caption?: string
  taken_at?: string
  latitude?: number
  longitude?: number
  album_id?: string
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
  exif?: ExifData
}

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  || 'https://lncewemrcsfqfzjgrcdu.supabase.co/functions/v1'

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
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

  const uploadPhoto = useCallback(async (file: File, { caption, album_id, exif: exifData }: UploadOptions = {}): Promise<Photo> => {
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

    const token = await getToken()
    if (!token) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('file', file)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

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
        uploaded_by: user?.id,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Photo DB insert failed; file may be orphaned on storage', error)
      throw error
    }

    setPhotos(prev => [data, ...prev])
    db.photos.put(data)
    toast.success('Photo uploaded')
    return data
  }, [toast])

  const deletePhoto = useCallback(async (photo: Photo) => {
    try {
      const token = await getToken()
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
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      db.photos.delete(photo.id)
      toast.info('Photo deleted')
    } catch (err) {
      console.error('Failed to delete photo', err)
      toast.error('Failed to delete photo')
    }
  }, [toast])

  return { photos, albums, loading, uploadPhoto, deletePhoto, refresh: fetchAll }
}
