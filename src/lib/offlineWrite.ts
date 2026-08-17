import { supabase } from './supabase'
import db from './db'

function isNetworkError(err: any): boolean {
  const msg = (err?.message || err?.name || '').toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('the internet connection') ||
    err?.name === 'TypeError'
  )
}

export async function offlineInsert(
  table: string,
  record: Record<string, any>,
  opts?: { skipQueue?: boolean }
): Promise<{ data: any; queued: boolean }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(record)
      .select('*')
      .single()
    if (error) throw error
    return { data, queued: false }
  } catch (err) {
    if (opts?.skipQueue || !isNetworkError(err)) throw err
    const queuedAt = new Date().toISOString()
    await db.pending_changes.add({
      table,
      action: 'insert',
      payload: record,
      created_at: queuedAt,
    })
    return { data: { ...record, id: record.id || `offline-${queuedAt}` }, queued: true }
  }
}

export async function offlineUpdate(
  table: string,
  id: string,
  updates: Record<string, any>,
  opts?: { skipQueue?: boolean }
): Promise<{ data: any; queued: boolean }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return { data, queued: false }
  } catch (err) {
    if (opts?.skipQueue || !isNetworkError(err)) throw err
    await db.pending_changes.add({
      table,
      action: 'update',
      payload: { idField: 'id', id, data: updates },
      created_at: new Date().toISOString(),
    })
    return { data: { id, ...updates }, queued: true }
  }
}

export async function offlineDelete(
  table: string,
  id: string,
  opts?: { skipQueue?: boolean }
): Promise<{ queued: boolean }> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    if (error) throw error
    return { queued: false }
  } catch (err) {
    if (opts?.skipQueue || !isNetworkError(err)) throw err
    await db.pending_changes.add({
      table,
      action: 'delete',
      payload: { idField: 'id', id },
      created_at: new Date().toISOString(),
    })
    return { queued: true }
  }
}
