import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import exifr from 'exifr'
import db from '../lib/db'
import { queueChange } from '../lib/sync'
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

const PHOTO_SERVER_URL = import.meta.env.VITE_PHOTO_SERVER_URL
const PHOTO_SERVER_API_KEY = import.meta.env.VITE_PHOTO_SERVER_API_KEY

async function uploadToPiServer(file: File): Promise<{ storage_path: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(`${PHOTO_SERVER_URL}/upload`, {
      method: 'POST',
      headers: { 'X-API-Key': PHOTO_SERVER_API_KEY! },
      body: formData,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Pi server upload failed: ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function uploadToSupabase(file: File, path: string): Promise<{ publicUrl: string }> {
  const { error } = await supabase.storage.from('photos').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
  return { publicUrl }
}

function isPiPhoto(url: string): boolean {
  return !!PHOTO_SERVER_URL && url.startsWith(PHOTO_SERVER_URL)
}

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const fetchAll = useCallback(async () => {
    try {
      const [photosRes, albumsRes] = await Promise.all([
        supabase.from('photos').select('*').order('taken_at', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('photo_albums').select('*').order('name'),
      ])
      if (!photosRes.error) { setPhotos(photosRes.data || []); db.photos.bulkPut(photosRes.data || []) }
      if (!albumsRes.error) { setAlbums(albumsRes.data || []); db.photo_albums.bulkPut(albumsRes.data || []) }
    } catch {} finally { setLoading(false) }
  }, [])

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

    const ext = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${ext}`
    const path = `photos/${fileName}`

    let storage_path: string
    let url: string
    let uploadedToPi = false

    if (PHOTO_SERVER_URL && PHOTO_SERVER_API_KEY) {
      try {
        const result = await uploadToPiServer(file)
        storage_path = `photos/${result.storage_path}`
        url = `${PHOTO_SERVER_URL}/photos/${result.storage_path}`
        uploadedToPi = true
      } catch {
        const result = await uploadToSupabase(file, path)
        storage_path = path
        url = result.publicUrl
      }
    } else {
      const result = await uploadToSupabase(file, path)
      storage_path = path
      url = result.publicUrl
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('photos')
      .insert({
        storage_path,
        url,
        caption: caption || null,
        taken_at: takenAt,
        latitude, longitude,
        album_id: album_id || null,
        uploaded_by: user?.id,
      })
      .select('*')
      .single()

    if (error) {
      if (uploadedToPi) {
        await fetch(`${PHOTO_SERVER_URL}/photos/${storage_path.replace('photos/', '')}`, {
          method: 'DELETE',
          headers: { 'X-API-Key': PHOTO_SERVER_API_KEY! },
        })
      } else {
        await supabase.storage.from('photos').remove([storage_path])
      }
      throw error
    }

    setPhotos(prev => [data, ...prev])
    db.photos.put(data)
    toast.success('Photo uploaded')
    return data
  }, [toast])

  const deletePhoto = useCallback(async (photo: Photo) => {
    try {
      if (isPiPhoto(photo.url)) {
        const filename = photo.url.split('/').pop()!
        await Promise.all([
          fetch(`${PHOTO_SERVER_URL}/photos/${filename}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': PHOTO_SERVER_API_KEY! },
          }),
          supabase.from('photos').delete().eq('id', photo.id),
        ])
      } else {
        await Promise.all([
          supabase.storage.from('photos').remove([photo.storage_path]),
          supabase.from('photos').delete().eq('id', photo.id),
        ])
      }
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      db.photos.delete(photo.id)
      toast.info('Photo deleted')
    } catch {
      toast.error('Failed to delete photo')
    }
  }, [toast])

  return { photos, albums, loading, uploadPhoto, deletePhoto, refresh: fetchAll }
}
