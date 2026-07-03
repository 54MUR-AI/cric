import { supabase } from './supabase'
import db from './db'

export async function syncTable(table, query) {
  const { data, error } = await query
  if (error) throw error
  if (data) await db.table(table).bulkPut(data)
  return data
}

export async function refreshAll() {
  await Promise.allSettled([
    syncTable('cabins', supabase.from('cabins').select('*').order('sort_order').order('name')),
    syncTable('bookings', supabase.from('bookings').select('*, cabins(name, color), profiles:user_id(display_name)').order('start_date')),
    syncTable('maintenance_tasks', supabase.from('maintenance_tasks').select('*, maintenance_categories(name), assigned_to_profile:assigned_to(display_name), created_by_profile:created_by(display_name)').order('created_at', { ascending: false })),
    syncTable('maintenance_categories', supabase.from('maintenance_categories').select('*').order('sort_order').order('name')),
    syncTable('meetings', supabase.from('meetings').select('*, profiles:created_by(display_name)').order('date', { ascending: false })),
    syncTable('map_pins', supabase.from('map_pins').select('*, cabin:cabins(name)').order('label')),
    syncTable('photos', supabase.from('photos').select('*').order('taken_at', { ascending: false }).order('created_at', { ascending: false })),
    syncTable('photo_albums', supabase.from('photo_albums').select('*').order('name')),
    syncTable('officers', supabase.from('officers').select('*, profile:profile_id(display_name)').order('sort_order')),
    syncTable('profiles', supabase.from('profiles').select('*').order('display_name')),
  ])
}

export async function queueChange(table, action, payload) {
  await db.pending_changes.add({ table, action, payload, created_at: new Date().toISOString() })
}

export async function processPending() {
  const changes = await db.pending_changes.toArray()
  for (const change of changes) {
    try {
      if (change.action === 'insert') {
        await supabase.from(change.table).insert(change.payload)
      } else if (change.action === 'update') {
        await supabase.from(change.table).update(change.payload.data).eq(change.payload.idField, change.payload.id)
      } else if (change.action === 'delete') {
        await supabase.from(change.table).delete().eq(change.payload.idField, change.payload.id)
      }
      await db.pending_changes.delete(change.id)
    } catch (e) {
      console.warn('Failed to sync pending change:', change, e)
    }
  }
}
