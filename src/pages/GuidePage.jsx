import { BookOpen, Phone, Zap, Droplets, Flame, Ship, AlertTriangle } from 'lucide-react'

const BASE = import.meta.env.BASE_URL

function Img({ name, alt, className = '' }) {
  return (
    <img
      src={`${BASE}images/guide/${name}`}
      alt={alt}
      className={`w-full max-w-md rounded-lg border border-stone-300 dark:border-stone-600 shadow-sm ${className}`}
      loading="lazy"
    />
  )
}

const sections = [
  {
    id: 'critical',
    icon: AlertTriangle,
    title: 'Critical Rules',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30',
    content: (
      <div className="prose prose-sm max-w-none text-stone-700 dark:text-stone-300">
        <p className="font-bold text-red-700 dark:text-red-400">Generator Breakers and Solar Breakers must NEVER power the same loads at the same time.</p>
      </div>
    ),
  },
  {
    id: 'solar-start',
    icon: Zap,
    title: 'Solar Power — Start',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-3">
        <ol className="list-decimal list-inside space-y-1">
          <li>Inspect battery box for critters; close box.<Img name="image5.jpg" alt="Battery box" className="mt-1" /></li>
          <li>Confirm Charge Controller LEDs are lit.<Img name="image13.jpg" alt="Charge Controller" className="mt-1" /></li>
          <li>Turn ALL Generator Load Panel breakers OFF (down).<Img name="image6.jpg" alt="Generator breakers" className="mt-1" /></li>
          <li>Connect red monitor wire if disconnected.<Img name="image16.jpg" alt="Red monitor wire" className="mt-1" /></li>
          <li>Rotate Charge Controller Battery Switch counter-clockwise two notches → Main Bank.<Img name="image1.jpg" alt="Charge controller switch" className="mt-1" /></li>
          <li>Switch Inverter Battery Switch to Main Bank.</li>
          <li>Close Inverter Breaker (lever horizontal).<Img name="image11.jpg" alt="Inverter breaker" className="mt-1" /></li>
          <li>Turn inverter ON (power-save off); wait for "Inverter Power On Line" LED.<Img name="image2.jpg" alt="Inverter" className="mt-1" /></li>
          <li>Turn on Water Pump breaker in Solar Load Panel → pump runs then shuts off.<Img name="image3.jpg" alt="Solar breakers" className="mt-1" /></li>
          <li>Turn on desired cabin breakers in Solar Load Panel.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'solar-close',
    icon: Zap,
    title: 'Solar Power — Close',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-3">
        <ol className="list-decimal list-inside space-y-1">
          <li>All Solar Load Panel breakers OFF (down).<Img name="image3.jpg" alt="Solar breakers OFF" className="mt-1" /></li>
          <li>All Generator breakers OFF (down).<Img name="image6.jpg" alt="Generator breakers OFF" className="mt-1" /></li>
          <li>Inverter OFF (middle position — all lights must be out).<Img name="image2.jpg" alt="Inverter OFF" className="mt-1" /></li>
          <li>Open Inverter Breaker (yellow button → lever vertical).<Img name="image11.jpg" alt="Inverter breaker open" className="mt-1" /></li>
          <li>Rotate Charge Controller switch clockwise two notches → Aux Bank.<Img name="image1.jpg" alt="Charge controller aux" className="mt-1" /></li>
          <li>Inverter switch to Aux Bank.</li>
          <li>Disconnect red monitor wire.<Img name="image16.jpg" alt="Red monitor wire disconnect" className="mt-1" /></li>
          <li>If maintainer works: Connect to generator battery and close its breaker.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'battery-reset',
    icon: Zap,
    title: 'Battery Reset (Battleborn BMS)',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
        <p>Call <strong>Battleborn</strong> first: <a href="tel:+17756223448" className="text-emerald-700 dark:text-emerald-400 hover:underline">775-622-3448</a> (Pacific).<Img name="image5.jpg" alt="Battery bank" className="mt-1" /></p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Turn Inverter OFF.</li>
          <li>Jumper Aux + to Main + and Aux – to Main –.</li>
          <li>Turn both switches to 1&2 (up).</li>
        </ol>
        <p className="text-xs text-stone-500 dark:text-stone-400">In 2024 a single jumper from primary positive bus to aux positive post raised voltage from ~4.5V to 23.5V.</p>
        <Img name="image8.jpg" alt="Battery status monitor" />
      </div>
    ),
  },
  {
    id: 'solar-monitoring',
    icon: Zap,
    title: 'Solar Monitoring & Tips',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-3">
        <Img name="image17.jpg" alt="Solar panels and combiner box" className="mb-2" />
        <ul className="list-disc list-inside space-y-1">
          <li>Daily use: 30–50% of battery capacity. With clouds, runs out after ~2 days.</li>
          <li>Full charge by 10–11am on sunny days.</li>
          <li>Check charge at 10–11am; shut off water in unoccupied houses if low.</li>
          <li>Keep pump house door closed (stays warmer).</li>
          <li>Cannot use electrical appliances/tools that create heat (hairdryers, toasters, etc.).</li>
          <li>Toilet left running one night drained batteries significantly.</li>
          <li>Low-voltage cutoff suggested to prevent total drain.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'generator',
    icon: Flame,
    title: 'Generator (Propane)',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30',
    content: (
      <div className="space-y-3 text-sm text-stone-700 dark:text-stone-300">
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Normal Use</h4>
          <p>Run ~10 minutes at least once every two weeks.</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Propane on, regulator green. Open primary tank first.<Img name="image4.jpg" alt="Propane regulator" className="mt-1" /></li>
            <li>Battery cables secure inside generator.<Img name="image9.jpg" alt="Generator battery" className="mt-1" /></li>
            <li>Charger plugged under desk (SLI / 10A).<Img name="image7.jpg" alt="Battery charger" className="mt-1" /></li>
            <li>Solar 'pump' breaker OFF → Generator 'pump' breaker ON.<Img name="image6.jpg" alt="Generator breakers" className="mt-1" /></li>
            <li>Generator switch: MANUAL or AUTOMATIC.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">If Generator Won't Start</h4>
          <p>Almost always battery. Tighten terminals. Charge via solar charger (Solar 'pump' ON) for 90+ minutes. Green 'Full' light may appear before ready — give it time.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'water',
    icon: Droplets,
    title: 'Water Systems',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
        <p>Each house has its own <strong>main water shutoff</strong>.</p>
        <p><strong>Insect treatment:</strong> Diatomaceous Earth, 4–6 tbsp per gallon, labeled spray bottle at Main Camp.</p>
      </div>
    ),
  },
  {
    id: 'boats',
    icon: Ship,
    title: 'Boats',
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-3">
        <p><strong>Dr Fun (Pontoon):</strong> Wet gear warning on front deck. Only 93 octane. $25/round trip. Top white light needs repair. Registration inside foam part of key fob.<Img name="image10.jpg" alt="Pontoon full cover" className="mt-1" /></p>
        <p><strong>Gas fee:</strong> $25/round trip (log book + box on desk in Main House). First/last launch/retrieval of season paid by CRIC.</p>
        <p><strong>15hp:</strong> Must be in <strong>neutral</strong> before starting (starting in gear can strip the rewind). Short pull only — if you pull the handle all the way out it will get stuck and need finagling to rewind.</p>
        <p><strong>Boating safety:</strong> Proof of passing a boating safety class required for operators.</p>
        <p><strong>Propane fee:</strong> $6/night per adult (first 7 days), $3/night per adult (additional nights). No charge for young kids.</p>
      </div>
    ),
  },
  {
    id: 'contacts',
    icon: Phone,
    title: 'Key Contacts',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30',
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {[
          ['Mike Hanley (boats)', '315-806-9899'],
          ['Matt Hamill (pontoon access)', '603-548-6429'],
          ['Dean Kerr (plumber)', '315-408-4363'],
          ['Brett Blackmer (electrician)', '315-408-5917'],
          ['Jon Davenport (carpenter)', '315-854-5631'],
          ['Nick Lamarre (tree guy)', '518-578-0980'],
          ['Bill Smith (former boat — unreliable)', '315-790-7512'],
          ['Battleborn (battery support)', '775-622-3448'],
          ['Neil (solar/battery)', '603-819-1058'],
          ['Birch\'s Lakeside (boat slip/propane)', '315-848-4500'],
          ['PJ Birchenough (propane deliver)', '814-440-1025'],
          ['Tripp Fuel & Propane', '315-287-1245'],
          ['Val Kerr (house cleaner, via Dean)', '—'],
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
]

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Cranberry Guide</h1>
      </div>
      <p className="text-sm text-stone-500 dark:text-stone-400">Operating procedures, contacts, and reference for CRIC Island. Source: Cranberry Guide (maintained by Neil Donnelly & CRIC members).</p>

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

      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 p-5">
        <h2 className="font-semibold text-stone-800 dark:text-stone-200 mb-3">Full Cranberry Guide</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Scan the QR code to access the complete Cranberry Guide document maintained by Neil Donnelly.</p>
        <Img name="image12.jpg" alt="QR Code to Cranberry Guide" className="max-w-[200px]" />
      </div>
    </div>
  )
}
