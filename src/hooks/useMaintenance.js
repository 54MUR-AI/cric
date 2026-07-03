import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useMaintenance() {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    const [tasksRes, catsRes] = await Promise.all([
      supabase.from('maintenance_tasks').select('*, maintenance_categories(name), assigned_to_profile:assigned_to(display_name), created_by_profile:created_by(display_name)').order('created_at', { ascending: false }),
      supabase.from('maintenance_categories').select('*').order('sort_order').order('name'),
    ])
    setTasks(tasksRes.data || [])
    setCategories(catsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function createTask(task) {
    const { data, error } = await supabase.from('maintenance_tasks').insert(task).select().single()
    if (error) throw error
    if (data) {
      const { data: full } = await supabase
        .from('maintenance_tasks')
        .select('*, maintenance_categories(name), assigned_to_profile:assigned_to(display_name), created_by_profile:created_by(display_name)')
        .eq('id', data.id).single()
      if (full) setTasks((prev) => [full, ...prev])
    }
    return data
  }

  async function updateTask(id, updates) {
    const { data } = await supabase.from('maintenance_tasks').update(updates).eq('id', id).select().single()
    if (data) setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
    return data
  }

  async function deleteTask(id) {
    await supabase.from('maintenance_tasks').delete().eq('id', id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return { tasks, categories, loading, createTask, updateTask, deleteTask, refetch: fetchData }
}
