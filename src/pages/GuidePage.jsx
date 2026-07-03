import { BookOpen, Phone, Zap, Droplets, Flame, Ship, AlertTriangle } from 'lucide-react'

const sections = [
  {
    id: 'critical',
    icon: AlertTriangle,
    title: 'Critical Rules',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    content: (
      <div className="prose prose-sm max-w-none text-stone-700">
        <p className="font-bold text-red-700">Generator Breakers and Solar Breakers must NEVER power the same loads at the same time.</p>
      </div>
    ),
  },
  {
    id: 'solar-start',
    icon: Zap,
    title: 'Solar Power — Start',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    content: (
      <ol className="list-decimal list-inside space-y-1 text-sm text-stone-700">
        <li>Inspect battery box for critters; close box.</li>
        <li>Confirm Charge Controller LEDs are lit.</li>
        <li>Turn ALL Generator Load Panel breakers OFF (down).</li>
        <li>Connect red monitor wire if disconnected.</li>
        <li>Rotate Charge Controller Battery Switch counter-clockwise two notches → Main Bank.</li>
        <li>Switch Inverter Battery Switch to Main Bank.</li>
        <li>Close Inverter Breaker (lever horizontal).</li>
        <li>Turn inverter ON (power-save off); wait for "Inverter Power On Line" LED.</li>
        <li>Turn on Water Pump breaker in Solar Load Panel → pump runs then shuts off.</li>
        <li>Turn on desired cabin breakers in Solar Load Panel.</li>
      </ol>
    ),
  },
  {
    id: 'solar-close',
    icon: Zap,
    title: 'Solar Power — Close',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    content: (
      <ol className="list-decimal list-inside space-y-1 text-sm text-stone-700">
        <li>All Solar Load Panel breakers OFF (down).</li>
        <li>All Generator breakers OFF (down).</li>
        <li>Inverter OFF (middle position — all lights must be out).</li>
        <li>Open Inverter Breaker (yellow button → lever vertical).</li>
        <li>Rotate Charge Controller switch clockwise two notches → Aux Bank.</li>
        <li>Inverter switch to Aux Bank.</li>
        <li>Disconnect red monitor wire.</li>
        <li>If maintainer works: Connect to generator battery and close its breaker.</li>
      </ol>
    ),
  },
  {
    id: 'battery-reset',
    icon: Zap,
    title: 'Battery Reset (Battleborn BMS)',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    content: (
      <div className="text-sm text-stone-700 space-y-2">
        <p>Call <strong>Battleborn</strong> first: <a href="tel:+17756223448" className="text-emerald-700 hover:underline">775-622-3448</a> (Pacific).</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Turn Inverter OFF.</li>
          <li>Jumper Aux + to Main + and Aux – to Main –.</li>
          <li>Turn both switches to 1&2 (up).</li>
        </ol>
        <p className="text-xs text-stone-500">In 2024 a single jumper from primary positive bus to aux positive post raised voltage from ~4.5V to 23.5V.</p>
      </div>
    ),
  },
  {
    id: 'solar-monitoring',
    icon: Zap,
    title: 'Solar Monitoring & Tips',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    content: (
      <ul className="list-disc list-inside space-y-1 text-sm text-stone-700">
        <li>Daily use: 30–50% of battery capacity. With clouds, runs out after ~2 days.</li>
        <li>Full charge by 10–11am on sunny days.</li>
        <li>Check charge at 10–11am; shut off water in unoccupied houses if low.</li>
        <li>Keep pump house door closed (stays warmer).</li>
        <li>Cannot use electrical appliances/tools that create heat (hairdryers, toasters, etc.).</li>
        <li>Toilet left running one night drained batteries significantly.</li>
        <li>Low-voltage cutoff suggested to prevent total drain.</li>
      </ul>
    ),
  },
  {
    id: 'generator',
    icon: Flame,
    title: 'Generator (Propane)',
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    content: (
      <div className="space-y-3 text-sm text-stone-700">
        <div>
          <h4 className="font-medium text-stone-800 mb-1">Normal Use</h4>
          <p>Run ~10 minutes at least once every two weeks.</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Propane on, regulator green. Open primary tank first.</li>
            <li>Battery cables secure inside generator.</li>
            <li>Charger plugged under desk (SLI / 10A).</li>
            <li>Solar 'pump' breaker OFF → Generator 'pump' breaker ON.</li>
            <li>Generator switch: MANUAL or AUTOMATIC.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-stone-800 mb-1">If Generator Won't Start</h4>
          <p>Almost always battery. Tighten terminals. Charge via solar charger (Solar 'pump' ON) for 90+ minutes. Green 'Full' light may appear before ready — give it time.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'water',
    icon: Droplets,
    title: 'Water Systems',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    content: (
      <div className="text-sm text-stone-700 space-y-2">
        <p>Each house has its own <strong>main water shutoff</strong>.</p>
        <p><strong>Insect treatment:</strong> Diatomaceous Earth, 4–6 tbsp per gallon, labeled spray bottle at Main Camp.</p>
      </div>
    ),
  },
  {
    id: 'boats',
    icon: Ship,
    title: 'Boats',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 border-cyan-200',
    content: (
      <div className="text-sm text-stone-700 space-y-2">
        <p><strong>Dr Fun (Pontoon):</strong> Wet gear warning on front deck. Only 93 octane. $25/round trip. Top white light needs repair.</p>
        <p><strong>Gas fee:</strong> $25/round trip (log book + box on desk in Main House). First/last launch/retrieval of season paid by CRIC.</p>
        <p><strong>15hp:</strong> Pull cord requires patience but working.</p>
      </div>
    ),
  },
  {
    id: 'contacts',
    icon: Phone,
    title: 'Key Contacts',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {[
          ['Mike Hanley (boats)', '315-806-9899'],
          ['Dean Kerr (plumber)', '315-408-4363'],
          ['Jon Davenport (foundation/carpenter)', '315-854-5631'],
          ['Battleborn (battery support)', '775-622-3448'],
          ['Neil (solar/battery)', '603-819-1058'],
          ['PJ Birchenough (propane)', '814-440-1025'],
          ['Tripp (propane alt)', '315-287-1245'],
        ].map(([name, phone]) => (
          <div key={name} className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-medium text-stone-800">{name}</p>
              <a href={`tel:${phone}`} className="text-emerald-700 hover:underline">{phone}</a>
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
        <BookOpen className="h-6 w-6 text-emerald-700" />
        <h1 className="text-2xl font-bold text-stone-800">Cranberry Guide</h1>
      </div>
      <p className="text-sm text-stone-500">Operating procedures, contacts, and reference for CRIC Island. Source: Cranberry Guide (maintained by Neil Donnelly & CRIC members).</p>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.id} id={s.id} className={`rounded-lg border p-5 ${s.bg}`}>
            <div className="flex items-center gap-2 mb-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <h2 className="font-semibold text-stone-800">{s.title}</h2>
            </div>
            {s.content}
          </div>
        ))}
      </div>
    </div>
  )
}
