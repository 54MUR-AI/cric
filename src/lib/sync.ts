import { supabase } from './supabase'
import db from './db'

export async function syncTable(table: string, query: any) {
  const { data, error } = await query
  if (error) throw error
  if (data) {
    const tbl = (db as any)[table]
    if (tbl?.bulkPut) await tbl.bulkPut(data)
  }
  return data
}

export async function refreshAll() {
  await Promise.allSettled([
    syncTable('cabins', supabase.from('cabins').select('*').order('sort_order').order('name')),
    syncTable('bookings', supabase.from('bookings').select('*, cabins(name, color)').order('start_date')),
    syncTable('maintenance_tasks', supabase.from('maintenance_tasks').select('*, maintenance_categories(name), assigned_to_profile:assigned_to(display_name), created_by_profile:created_by(display_name)').order('created_at', { ascending: false })),
    syncTable('maintenance_categories', supabase.from('maintenance_categories').select('*').order('sort_order').order('name')),
    syncTable('meetings', supabase.from('meetings').select('*, profiles:created_by(display_name)').order('date', { ascending: false })),
    syncTable('map_pins', supabase.from('map_pins').select('*, cabin:cabins(name)').order('label')),
    syncTable('photos', supabase.from('photos').select('*').order('taken_at', { ascending: false }).order('created_at', { ascending: false })),
    syncTable('photo_albums', supabase.from('photo_albums').select('*').order('name')),
    syncTable('officers', supabase.from('officers').select('*, profile:profile_id(display_name)').order('sort_order')),
    syncTable('profiles', supabase.from('profiles').select('*').order('display_name')),
    syncTable('boat_trips', supabase.from('boat_trips').select('*, profiles:created_by(display_name)').order('trip_date').order('departure_time')),
  ])
}

interface PendingChange {
  id?: number
  table: string
  action: 'insert' | 'update' | 'delete'
  payload: any
  created_at: string
}

export async function queueChange(table: string, action: string, payload: any) {
  await db.pending_changes.add({ table, action, payload, created_at: new Date().toISOString() })
}

export async function processPending() {
  const changes = await db.pending_changes.toArray()
  for (const change of changes) {
    try {
      if (change.action === 'insert') {
        await (supabase.from(change.table) as any).insert(change.payload)
      } else if (change.action === 'update') {
        await (supabase.from(change.table) as any).update(change.payload.data).eq(change.payload.idField, change.payload.id)
      } else if (change.action === 'delete') {
        await (supabase.from(change.table) as any).delete().eq(change.payload.idField, change.payload.id)
      }
      await db.pending_changes.delete(change.id!)
    } catch (e) {
      console.warn('Failed to sync pending change:', change, e)
    }
  }
}
