import { AlertTriangle, Phone, MapPin, Shield, FileText, Ship, Wifi, Locate, Info } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const BASE = import.meta.env.BASE_URL

const sections = [
  {
    id: 'no-cell',
    icon: Wifi,
    title: 'No Cell Service',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
        <p className="font-semibold">There is NO cell phone service on Chair Rock Island.</p>
        <p>In an emergency, you must take a boat to Cranberry Lake town (the Foot) to get service or reach the Cranberry Lake Fire Department. The boat trip is ~45 minutes one way.</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">In 2018, a fire on Al (neighboring island) had to be handled without cell service — a boat was dispatched to reach help.</p>
      </div>
    ),
  },
  {
    id: 'fire',
    icon: AlertTriangle,
    title: 'Fire Plan',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
        <p><strong>If you see a fire on the island or nearby:</strong></p>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>Get everyone to the water</strong> — launch boats, head to the lake.</li>
          <li>Use the pontoon boat (<strong>Dr Fun</strong>) to get to Cranberry Lake town and call 911.</li>
          <li>Alert neighboring cabins and islands by boat.</li>
        </ol>
        <p className="mt-2"><strong>Fire extinguishers</strong> are located in:</p>
        <ul className="list-disc list-inside">
          <li>Main House — kitchen area</li>
          <li>Main House — near generator panel</li>
          <li>Toad Hall — kitchen</li>
          <li>Loon Lodge — kitchen</li>
          <li>Near the propane tanks</li>
        </ul>
        <p className="mt-2"><strong>Water Pump on Buck Island</strong> — Bill Bragdon (<a href="tel:+14842221354" className="text-emerald-700 dark:text-emerald-400 hover:underline">484-222-1354</a>) is the contact for the water pump on Buck Island.</p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">No fire department can reach the island directly. Prevention is critical. Never leave stoves, candles, or propane appliances unattended.</p>
      </div>
    ),
  },
  {
    id: 'medical',
    icon: Locate,
    title: 'Medical Emergencies',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
        <p><strong>First aid kits</strong> are in Main House kitchen, Main House 1st floor bathroom, and Toad Hall bathroom.</p>
        <p><strong>For serious emergencies:</strong> Transport via boat to Cranberry Lake town (45 min), then drive or call ambulance.</p>
        <div className="mt-2 p-3 rounded bg-white/50 dark:bg-stone-800/50">
          <p className="font-medium">Clifton-Fine Hospital</p>
          <p className="text-xs">8 Ossipee Trail, Star Lake, NY 13690</p>
          <p className="text-xs">~30 min drive from Cranberry Lake town</p>
          <p className="text-xs">Phone: <a href="tel:+13158485551" className="text-emerald-700 dark:text-emerald-400 hover:underline">315-848-5551</a></p>
        </div>
      </div>
    ),
  },
  {
    id: 'contacts',
    icon: Phone,
    title: 'Emergency Contacts',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/30',
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {[
          ['Emergency (Police/Fire/Ambulance)', '911'],
          ['Cranberry Lake Fire & Rescue', '911'],
          ['DEC Forest Ranger (marine patrol)', '518-897-1300'],
          ['Clifton-Fine Hospital', '315-848-5551'],
          ['Poison Control', '1-800-222-1222'],
          ['Mike Hanley (boat/motor)', '315-806-9899'],
          ['Dean Kerr (plumber, water)', '315-408-4363'],
          ['Jon Davenport (carpenter)', '315-854-5631'],
          ['Non-emergency marine assist', '518-354-5006'],
        ].map(([name, phone]) => (
          <div key={name} className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-medium text-stone-800 dark:text-stone-200">{name}</p>
              <a href={`tel:${phone}`} className="text-emerald-700 dark:text-emerald-400 hover:underline">{phone}</a>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'weather',
    icon: AlertTriangle,
    title: 'Severe Weather',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
        <p>Severe thunderstorms can develop quickly on Cranberry Lake. If you hear thunder or see lightning:</p>
        <ul className="list-disc list-inside">
          <li><strong>Get off the water</strong> immediately — return to the island.</li>
          <li>Stay inside the Main House or nearest cabin.</li>
          <li>Unplug sensitive electronics (the solar/inverter system is sensitive to surges).</li>
          <li>Do not use the pontoon boat during lightning.</li>
          <li>Wait at least 30 minutes after the last thunder before going back on the water.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'precautions',
    icon: Shield,
    title: 'General Precautions',
    color: 'text-stone-600 dark:text-stone-400',
    bg: 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Propane:</strong> Turn off tank valves when not in use. Know where the main shutoff is.</li>
          <li><strong>Water:</strong> Each cabin has its own main water shutoff — learn where it is on arrival.</li>
          <li><strong>Always let someone know</strong> when you are leaving the island and your expected return time.</li>
          <li><strong>Boat safety:</strong> Life jackets are on Dr Fun and in each cabin. NY State requires a Boating Safety Certificate to operate a power boat.</li>
          <li><strong>Generator:</strong> Never refuel while running. Propane only.</li>
          <li><strong>Wildlife:</strong> Store food in sealed containers. Watch for otters, beavers, and bears.</li>
        </ul>
      </div>
    ),
  },
]

export default function EmergencyPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Emergency & Safety</h1>
      </div>
      <p className="text-sm text-stone-500 dark:text-stone-400">Critical safety information for Chair Rock Island. <strong>No cell service on the island</strong> — plan accordingly.</p>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.id} id={s.id} className={`rounded-lg border p-5 ${s.bg}`}>
            <div className="flex items-center gap-2 mb-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <h2 className="font-semibold text-stone-800 dark:text-stone-200">{s.title}</h2>
            </div>
            {s.content}
          </div>
        ))}
      </div>
    </div>
  )
}
