import Dexie from 'dexie'

const db = new Dexie('cric')

db.version(1).stores({
  cabins: 'id, name, sort_order',
  bookings: 'id, cabin_id, start_date, end_date',
  maintenance_tasks: 'id, status, category_id, due_date',
  maintenance_categories: 'id, name',
  maintenance_comments: 'id, task_id, created_at',
  meetings: 'id, date',
  meeting_agenda_items: 'id, meeting_id, sort_order',
  map_pins: 'id, type, label',
  photos: 'id, album_id, taken_at, created_at',
  photo_albums: 'id, name',
  weather_cache: '++id, key',
  pending_changes: '++id, table, action, payload, created_at',
  profiles: 'id',
})

export default db
