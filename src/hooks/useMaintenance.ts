import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { offlineInsert, offlineUpdate, offlineDelete } from '../lib/offlineWrite'
import { useToast } from '../components/ui/Toast'

interface CategoryRef {
  name: string
}

interface ProfileDisplay {
  display_name: string
}

interface MaintenanceTask {
  id: string
  title: string
  description?: string
  status: string
  category_id?: string
  assigned_to?: string
  created_by: string
  due_date?: string
  created_at?: string
  maintenance_categories?: CategoryRef
  assigned_to_profile?: ProfileDisplay
  created_by_profile?: ProfileDisplay
}

interface Category {
  id: string
  name: string
  sort_order?: number
  cabin_id?: string
  dock_id?: string
}

export function useMaintenance() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  async function fetchData() {
    const cached = await db.maintenance_tasks.orderBy('created_at').reverse().toArray()
    if (cached.length) setTasks(cached)
    const cachedCats = await db.maintenance_categories.orderBy('sort_order').toArray()
    if (cachedCats.length) setCategories(cachedCats)

    const [tasksRes, catsRes, profilesRes] = await Promise.all([
      supabase.from('maintenance_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('maintenance_categories').select('*').order('sort_order').order('name'),
      supabase.from('profiles').select('id, display_name'),
    ])
    if (tasksRes.data) {
      const catMap = new Map((catsRes.data ?? []).map(c => [c.id, c]))
      const profMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]))
      const merged = tasksRes.data.map(t => ({
        ...t,
        maintenance_categories: catMap.get(t.category_id) ? { name: catMap.get(t.category_id).name } : undefined,
        assigned_to_profile: profMap.get(t.assigned_to) ? { display_name: profMap.get(t.assigned_to).display_name } : undefined,
        created_by_profile: profMap.get(t.created_by) ? { display_name: profMap.get(t.created_by).display_name } : undefined,
      }))
      setTasks(merged)
      db.maintenance_tasks.bulkPut(merged)
    }
    if (catsRes.data) { setCategories(catsRes.data); db.maintenance_categories.bulkPut(catsRes.data) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function createTask(task: Partial<MaintenanceTask>) {
    const { data: insertData, queued } = await offlineInsert('maintenance_tasks', task)
    if (insertData) {
      if (!queued) {
        const { data: full } = await supabase
          .from('maintenance_tasks')
          .select('*')
          .eq('id', insertData.id).single()
        if (full) {
          const { data: catData } = await supabase.from('maintenance_categories').select('name').eq('id', full.category_id).single()
          if (catData) full.maintenance_categories = catData
          const { data: assignData } = full.assigned_to ? await supabase.from('profiles').select('display_name').eq('id', full.assigned_to).single() : { data: null }
          if (assignData) full.assigned_to_profile = assignData
          setTasks((prev) => [full, ...prev]); db.maintenance_tasks.put(full); toast.success('Task created')
        }
      } else {
        const optimistic = { ...task, id: insertData.id } as MaintenanceTask
        setTasks((prev) => [optimistic, ...prev]); db.maintenance_tasks.put(optimistic)
        toast.info('Task queued — will sync when online')
      }
    }
    return insertData
  }

  async function updateTask(id: string, updates: Partial<MaintenanceTask>) {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      const match = updated.find(t => t.id === id)
      if (match) db.maintenance_tasks.put(match)
      return updated
    })
    const { data, queued } = await offlineUpdate('maintenance_tasks', id, updates)
    if (queued) {
      toast.info('Task update queued — will sync when online')
    } else if (data) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t))); db.maintenance_tasks.put({ ...(tasks.find(t => t.id === id) || {}), ...data }); toast.success('Task updated')
    } else { fetchData(); toast.error('Failed to update task') }
    return data
  }

  async function deleteTask(id: string) {
    const prev = tasks
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      const { queued } = await offlineDelete('maintenance_tasks', id)
      db.maintenance_tasks.delete(id)
      toast.info(queued ? 'Task deletion queued — will sync when online' : 'Task deleted')
    } catch { setTasks(prev); toast.error('Failed to delete task') }
  }

  return { tasks, categories, loading, createTask, updateTask, deleteTask, refetch: fetchData }
}
