import { useState } from 'react'
import { useMaintenance } from '../hooks/useMaintenance'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import SwipeToDelete from '../components/ui/SwipeToDelete'
import { formatDate } from '../lib/utils'
import { Plus, MessageCircle } from 'lucide-react'

export default function MaintenancePage() {
  const { tasks, categories, loading, createTask, updateTask, deleteTask } = useMaintenance()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [formData, setFormData] = useState({ category_id: '', title: '', description: '', due_date: '' })

  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

  const statusColors = { todo: 'bg-amber-100 text-amber-800', in_progress: 'bg-blue-100 text-blue-800', done: 'bg-green-100 text-green-800' }

  async function openTask(task) {
    setSelectedTask(task)
    const { data } = await supabase.from('maintenance_comments').select('*, profiles:user_id(display_name)').eq('task_id', task.id).order('created_at')
    setComments(data || [])
    setNewComment('')
  }

  async function addComment() {
    if (!newComment.trim()) return
    await supabase.from('maintenance_comments').insert({ task_id: selectedTask.id, user_id: user.id, body: newComment })
    setNewComment('')
    const { data } = await supabase.from('maintenance_comments').select('*, profiles:user_id(display_name)').eq('task_id', selectedTask.id).order('created_at')
    setComments(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await createTask({ ...formData, created_by: user.id })
    setShowForm(false)
  }

  if (loading) return <div className="text-stone-500">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Maintenance</h1>
        <Button onClick={() => { setFormData({ category_id: categories[0]?.id || '', title: '', description: '', due_date: '' }); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> New Task
        </Button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <SwipeToDelete key={task.id} onDelete={() => { if (confirm('Delete this task?')) { deleteTask(task.id); setSelectedTask(null) } }}>
            <div className="rounded-lg bg-white p-4 shadow-sm border border-stone-200 flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => openTask(task)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-800 truncate">{task.title}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>{task.status.replace('_', ' ')}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-stone-400">
                  <span>{task.maintenance_categories?.name}</span>
                  {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
                  {task.assigned_to_profile && <span>Assigned to: {task.assigned_to_profile.display_name}</span>}
                </div>
              </div>
              <MessageCircle className="h-4 w-4 text-stone-400 shrink-0 ml-2" />
            </div>
          </SwipeToDelete>
        ))}
        {tasks.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No maintenance tasks yet</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">New Maintenance Task</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" required>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Due date</label>
                <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedTask(null)}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-800">{selectedTask.title}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[selectedTask.status]}`}>{selectedTask.status.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-stone-600 mb-4">
              <p><span className="font-medium">Category:</span> {selectedTask.maintenance_categories?.name}</p>
              {selectedTask.description && <p><span className="font-medium">Description:</span> {selectedTask.description}</p>}
              {selectedTask.due_date && <p><span className="font-medium">Due:</span> {formatDate(selectedTask.due_date)}</p>}
            </div>
            <div className="flex gap-2 mb-4">
              {selectedTask.status !== 'done' && <Button onClick={() => { updateTask(selectedTask.id, { status: selectedTask.status === 'todo' ? 'in_progress' : 'done', completed_at: selectedTask.status === 'in_progress' ? new Date().toISOString() : null }) }}>Mark {selectedTask.status === 'todo' ? 'In Progress' : 'Done'}</Button>}
              {selectedTask.status === 'done' && <Button onClick={() => updateTask(selectedTask.id, { status: 'todo', completed_at: null })}>Reopen</Button>}
              <Button variant="danger" onClick={() => { if (confirm('Delete this task?')) { deleteTask(selectedTask.id); setSelectedTask(null) } }}>Delete</Button>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <h3 className="font-medium text-stone-700 mb-3">Comments ({comments.length})</h3>
              <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium text-stone-700">{c.profiles?.display_name || 'Unknown'}</span>
                    <span className="text-stone-400 ml-2 text-xs">{formatDate(c.created_at)}</span>
                    <p className="text-stone-600 mt-0.5">{c.body}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-sm text-stone-400">No comments yet</p>}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm" onKeyDown={(e) => e.key === 'Enter' && addComment()} />
                <Button onClick={addComment} disabled={!newComment.trim()}>Send</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
