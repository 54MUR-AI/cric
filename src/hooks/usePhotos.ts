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

interface UploadOptions {
  caption?: string
  album_id?: string
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

  const uploadPhoto = useCallback(async (file: File, { caption, album_id }: UploadOptions = {}): Promise<Photo> => {
    let takenAt: string | null = null; let latitude: number | null = null; let longitude: number | null = null
    try {
      const exif = await exifr.parse(file, ['DateTimeOriginal', 'latitude', 'longitude'])
      if (exif?.DateTimeOriginal) takenAt = exif.DateTimeOriginal.toISOString()
      if (Number.isFinite(exif?.latitude) && Number.isFinite(exif?.longitude)) {
        latitude = exif.latitude; longitude = exif.longitude
      }
    } catch {}

    const ext = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${ext}`
    const path = `photos/${fileName}`

    const { error: uploadError } = await supabase.storage.from('photos').upload(path, file)
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('photos')
      .insert({
        storage_path: path,
        url: publicUrl,
        caption: caption || null,
        taken_at: takenAt,
        latitude, longitude,
        album_id: album_id || null,
        uploaded_by: user?.id,
      })
      .select('*')
      .single()

    if (error) {
      await supabase.storage.from('photos').remove([path])
      throw error
    }

    setPhotos(prev => [data, ...prev])
    db.photos.put(data)
    toast.success('Photo uploaded')
    return data
  }, [toast])

  const deletePhoto = useCallback(async (photo: Photo) => {
    try {
      await Promise.all([
        supabase.storage.from('photos').remove([photo.storage_path]),
        supabase.from('photos').delete().eq('id', photo.id),
      ])
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      db.photos.delete(photo.id)
      toast.info('Photo deleted')
    } catch {
      toast.error('Failed to delete photo')
    }
  }, [toast])

  return { photos, albums, loading, uploadPhoto, deletePhoto, refresh: fetchAll }
}
