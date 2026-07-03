import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePhotos() {
  const [photos, setPhotos] = useState([])
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [photosRes, albumsRes] = await Promise.all([
        supabase.from('photos').select('*, profile:uploaded_by(display_name)').order('taken_at', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('photo_albums').select('*').order('name'),
      ])
      if (!photosRes.error) setPhotos(photosRes.data || [])
      if (!albumsRes.error) setAlbums(albumsRes.data || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const uploadPhoto = useCallback(async (file, { caption, album_id } = {}) => {
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
        taken_at: null,
        album_id: album_id || null,
        uploaded_by: user?.id,
      })
      .select('*, profile:uploaded_by(display_name)')
      .single()

    if (error) {
      await supabase.storage.from('photos').remove([path])
      throw error
    }

    setPhotos(prev => [data, ...prev])
    return data
  }, [])

  const deletePhoto = useCallback(async (photo) => {
    await Promise.all([
      supabase.storage.from('photos').remove([photo.storage_path]),
      supabase.from('photos').delete().eq('id', photo.id),
    ])
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }, [])

  return { photos, albums, loading, uploadPhoto, deletePhoto, refresh: fetchAll }
}