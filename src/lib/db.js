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

db.version(2).stores({
  cabins: 'id, name, sort_order',
  bookings: 'id, cabin_id, start_date, end_date',
  maintenance_tasks: 'id, status, category_id, due_date, created_at',
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
}).upgrade(async tx => {
  // v2 added created_at to maintenance_tasks — existing rows get null
  await tx.table('maintenance_tasks').toCollection().modify(task => {
    if (!task.created_at) task.created_at = new Date(0).toISOString()
  })
})

db.version(3).stores({
  cabins: 'id, name, sort_order',
  bookings: 'id, cabin_id, start_date, end_date',
  maintenance_tasks: 'id, status, category_id, due_date, created_at',
  maintenance_categories: 'id, name, sort_order',
  maintenance_comments: 'id, task_id, created_at',
  meetings: 'id, date',
  meeting_agenda_items: 'id, meeting_id, sort_order',
  map_pins: 'id, type, label',
  photos: 'id, album_id, taken_at, created_at',
  photo_albums: 'id, name',
  weather_cache: '++id, key',
  pending_changes: '++id, table, action, payload, created_at',
  profiles: 'id',
}).upgrade(async tx => {
  // v3 added sort_order to maintenance_categories
  await tx.table('maintenance_categories').toCollection().modify(cat => {
    if (cat.sort_order === undefined) cat.sort_order = 0
  })
})

db.version(4).stores({
  cabins: 'id, name, sort_order',
  bookings: 'id, cabin_id, start_date, end_date',
  maintenance_tasks: 'id, status, category_id, due_date, created_at',
  maintenance_categories: 'id, name, sort_order',
  maintenance_comments: 'id, task_id, created_at',
  meetings: 'id, date',
  meeting_agenda_items: 'id, meeting_id, sort_order',
  map_pins: 'id, type, label',
  photos: 'id, album_id, taken_at, created_at',
  photo_albums: 'id, name',
  weather_cache: '++id, key',
  pending_changes: '++id, table, action, payload, created_at',
  profiles: 'id',
  officers: 'id, profile_id, title, sort_order',
})

db.version(5).stores({
  cabins: 'id, name, sort_order',
  bookings: 'id, cabin_id, start_date, end_date',
  maintenance_tasks: 'id, status, category_id, due_date, created_at',
  maintenance_categories: 'id, name, sort_order',
  maintenance_comments: 'id, task_id, created_at',
  meetings: 'id, date',
  meeting_agenda_items: 'id, meeting_id, sort_order',
  map_pins: 'id, type, label',
  photos: 'id, album_id, taken_at, created_at',
  photo_albums: 'id, name',
  weather_cache: '++id, key',
  pending_changes: '++id, table, action, payload, created_at',
  profiles: 'id',
  officers: 'id, profile_id, title, sort_order',
  boat_trips: 'id, trip_date, departure_time, created_by',
})

db.version(6).stores({
  cabins: 'id, name, sort_order',
  bookings: 'id, cabin_id, room, start_date, end_date',
  maintenance_tasks: 'id, status, category_id, due_date, created_at',
  maintenance_categories: 'id, name, sort_order',
  maintenance_comments: 'id, task_id, created_at',
  meetings: 'id, date',
  meeting_agenda_items: 'id, meeting_id, sort_order',
  map_pins: 'id, type, label',
  photos: 'id, album_id, taken_at, created_at',
  photo_albums: 'id, name',
  weather_cache: '++id, key',
  pending_changes: '++id, table, action, payload, created_at',
  profiles: 'id',
  officers: 'id, profile_id, title, sort_order',
  boat_trips: 'id, trip_date, departure_time, created_by',
}).upgrade(async tx => {
  // v6 added room index to bookings — populate if missing
  await tx.table('bookings').toCollection().modify(booking => {
    if (!booking.room) booking.room = null
  })
})

export default db
