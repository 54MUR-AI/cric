import Dexie, { type Table } from 'dexie'

interface Cabin {
  id: string
  name: string
  color?: string
  description?: string
  sort_order?: number
  rooms?: string[]
  max_occupancy?: number
  created_at?: string
}

interface Booking {
  id: string
  cabin_id: string
  user_id: string
  start_date: string
  end_date: string
  guests?: string
  room?: string
  created_at?: string
  cabins?: { name: string; color?: string }
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
  maintenance_categories?: { name: string }
  assigned_to_profile?: { display_name: string }
  created_by_profile?: { display_name: string }
}

interface MaintenanceCategory {
  id: string
  name: string
  sort_order?: number
}

interface MaintenanceComment {
  id: string
  task_id: string
  content?: string
  created_by?: string
  created_at?: string
}

interface Meeting {
  id: string
  date: string
  title?: string
  created_by?: string
  notes?: string
  created_at?: string
  profiles?: { display_name: string }
}

interface MeetingAgendaItem {
  id: string
  meeting_id: string
  title: string
  sort_order: number
  notes?: string
  completed?: boolean
}

interface MapPin {
  id: string
  label: string
  type: string
  latitude: number
  longitude: number
  description?: string
  cabin_id?: string
  created_by?: string
  created_at?: string
  cabin?: { name: string }
}

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

interface PhotoAlbum {
  id: string
  name: string
  description?: string
  created_at?: string
}

interface WeatherCache {
  id?: number
  key: string
  data: any
  ts: number
}

interface PendingChange {
  id?: number
  table: string
  action: string
  payload: any
  created_at: string
}

interface Profile {
  id: string
  display_name?: string
  email?: string
  is_admin?: boolean
  created_at?: string
}

interface Officer {
  id: string
  profile_id: string
  title: string
  sort_order?: number
  profile?: { display_name: string }
}

interface BoatTrip {
  id: string
  trip_date: string
  departure_time?: string
  destination?: string
  created_by?: string
  created_at?: string
  profiles?: { display_name: string }
}

class CricDatabase extends Dexie {
  cabins!: Table<Cabin, string>
  bookings!: Table<Booking, string>
  maintenance_tasks!: Table<MaintenanceTask, string>
  maintenance_categories!: Table<MaintenanceCategory, string>
  maintenance_comments!: Table<MaintenanceComment, string>
  meetings!: Table<Meeting, string>
  meeting_agenda_items!: Table<MeetingAgendaItem, string>
  map_pins!: Table<MapPin, string>
  photos!: Table<Photo, string>
  photo_albums!: Table<PhotoAlbum, string>
  weather_cache!: Table<WeatherCache, number>
  pending_changes!: Table<PendingChange, number>
  profiles!: Table<Profile, string>
  officers!: Table<Officer, string>
  boat_trips!: Table<BoatTrip, string>

  constructor() {
    super('cric')

    this.version(1).stores({
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

    this.version(2).stores({
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
      await tx.table('maintenance_tasks').toCollection().modify((task: any) => {
        if (!task.created_at) task.created_at = new Date(0).toISOString()
      })
    })

    this.version(3).stores({
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
      await tx.table('maintenance_categories').toCollection().modify((cat: any) => {
        if (cat.sort_order === undefined) cat.sort_order = 0
      })
    })

    this.version(4).stores({
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

    this.version(5).stores({
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

    this.version(6).stores({
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
      await tx.table('bookings').toCollection().modify((booking: any) => {
        if (!booking.room) booking.room = null
      })
    })
  }
}

const db = new CricDatabase()
export default db
export type { Cabin, Booking, MaintenanceTask, MaintenanceCategory, MaintenanceComment, Meeting, MeetingAgendaItem, MapPin, Photo, PhotoAlbum, WeatherCache, PendingChange, Profile, Officer, BoatTrip }
