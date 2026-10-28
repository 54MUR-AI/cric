import { useState, useEffect } from 'react'
import { BookOpen, Phone, Zap, Droplets, Flame, Ship, AlertTriangle, ClipboardCheck, RotateCcw, ChevronDown, DoorClosed, Radio, ExternalLink } from 'lucide-react'

const BASE = import.meta.env.BASE_URL
const GUIDE_DOC_URL = 'https://docs.google.com/document/d/1qzYZBits_npzdWyVz3qbGHQUomnhJKDU5K95ORbjpkE/edit?usp=sharing'

function Checklist({ id, items }) {
  const storageKey = `guide-checklist-${id}`
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {} } catch { return {} }
  })

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(checked)) }, [checked, storageKey])

  const done = Object.values(checked).filter(Boolean).length

  function toggle(i) { setChecked(p => ({ ...p, [i]: !p[i] })) }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
        <span>{done} of {items.length} completed</span>
        <button onClick={() => setChecked({})} className="flex items-center gap-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
          <RotateCcw className="h-3 w-3" />Reset
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ol className="list-none space-y-1">
        {items.map((item, i) => (
          <li key={i}>
            <label className={`flex items-start gap-2 cursor-pointer rounded px-2 py-1.5 transition-colors text-sm ${
              checked[i] ? 'bg-emerald-50 dark:bg-emerald-900/20 text-stone-500 dark:text-stone-400 line-through' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
            }`}>
              <input type="checkbox" checked={!!checked[i]} onChange={() => toggle(i)} className="mt-0.5 rounded border-stone-300 dark:border-stone-600 text-emerald-600 focus:ring-emerald-500" />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ol>
    </div>
  )
}

function GuideSection({ section, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div id={section.id} className={`rounded-lg border ${section.bg}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left p-5"
      >
        <section.icon className={`h-5 w-5 shrink-0 ${section.color}`} />
        <h2 className="font-semibold text-stone-800 dark:text-stone-200 flex-1">{section.title}</h2>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5">{section.content}</div>}
    </div>
  )
}

function NestedSection({ title, icon: Icon, color, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left p-4"
      >
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${color}`} />}
        <h3 className="font-medium text-stone-800 dark:text-stone-200 flex-1 text-sm">{title}</h3>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

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
    defaultOpen: true,
    content: (
      <div className="prose prose-sm max-w-none text-stone-700 dark:text-stone-300">
        <p className="font-bold text-red-700 dark:text-red-400">Generator Breakers and Solar Breakers must NEVER power the same loads at the same time.</p>
      </div>
    ),
  },
  {
    id: 'checklists',
    icon: ClipboardCheck,
    title: 'Seasonal Checklists',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/30',
    content: (
      <div className="space-y-5 text-sm">
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Open — Solar Power</h4>
          <Checklist id="solar-start" items={[
            'Inspect battery box for critters; close box.',
            'Confirm Charge Controller LEDs are lit.',
            'Turn ALL Generator Load Panel breakers OFF (down).',
            'Connect red monitor wire if disconnected.',
            'Rotate Charge Controller Battery Switch counter-clockwise two notches → Main Bank. Only one battery switch is wired and installed; move that same switch for this step and the next.',
            'Switch Inverter Battery Switch to Main Bank (same single switch as the step above).',
            'Close Inverter Breaker (lever horizontal).',
            'Turn inverter ON (power-save off); wait for "Inverter Power On Line" LED.',
            'Turn on Water Pump breaker in Solar Load Panel.',
            'Turn on desired cabin breakers in Solar Load Panel.',
          ]} />
        </div>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Close — Solar Power</h4>
          <Checklist id="solar-close" items={[
            'All Solar Load Panel breakers OFF (down).',
            'All Generator breakers OFF (down).',
            'Inverter OFF (middle position — all lights must be out).',
            'Open Inverter Breaker (yellow button → lever vertical).',
            'Rotate Charge Controller switch clockwise two notches → Aux Bank. Only one battery switch is wired and installed; move that same switch for this step and the next.',
            'Inverter switch to Aux Bank (same single switch as the step above).',
            'Disconnect red monitor wire.',
            'Battery Maintainer was blown at the end of 2021, so this step is currently void: connect its clips to the generator battery and close its breaker.',
          ]} />
        </div>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Generator (Propane)</h4>
          <Checklist id="generator" items={[
            'Propane on, regulator green. Open primary tank first.',
            'Battery cables secure inside generator.',
            'Charger plugged into the outlet under the desk (on the pump breaker), set to SLI / 10A. The generator does not keep its own battery maintained while running.',
            'Solar "pump" breaker OFF → Generator "pump" breaker ON.',
            'Generator switch: MANUAL or AUTOMATIC.',
            'Run ~10 minutes at least once every two weeks.',
            'If won\'t start: tighten battery terminals, charge via solar charger for 90+ min.',
          ]} />
        </div>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Leaving Camp — Generator Shutdown</h4>
          <Checklist id="generator-shutdown" items={[
            'Inside the generator, turn the switch to OFF.',
            'Disconnect the battery cables from the battery.',
            'Turn OFF all of the breakers on the Generator Breakers panel.',
          ]} />
        </div>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Resetting the Main Battery Bank (Battleborn BMS)</h4>
          <p className="mb-2 font-medium text-amber-800 dark:text-amber-300">Please call/text Neil Donnelly (<a href="tel:6038191058" className="underline">603-819-1058</a>) first if you're thinking of doing this.</p>
          <Checklist id="battery-reset" items={[
            'Turn the Inverter OFF.',
            'Call Battleborn Tech Support: 775-622-3448 (Pacific Time).',
            'Jumper Aux + to Main + and Aux – to Main –.',
            'Turn both switches to 1&2 (up).',
          ]} />
        </div>
        <NestedSection title="Closing Camp — Bat Manor" icon={DoorClosed} color="text-purple-600 dark:text-purple-400">
          <div className="space-y-5 text-sm">
            <div>
              <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Front Porch</h4>
              <Checklist id="bat-porch" items={[
                'Put away living room rugs (beat outside first) in tin closet',
                'Hammock – take down and put on toy chest',
                'Bike – put at foot of stairs',
                'Porch Furniture – place in living room (leave large table outside by door) – Leave out two rockers and small round table to enjoy last look at lake before leaving',
              ]} />
            </div>
            <div>
              <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Linen Closet / Beds / Rugs / Windows</h4>
              <Checklist id="bat-linen" items={[
                'Bedspreads/Mattress Pads – tin closet shelf in back',
                'Dirty linens – take home or launder at Birch\'s and put back in tin closet on shelf to the right',
                'Sleeping Bags – neatly rolled on floor of tin closet',
                'Blankets – Fold and store in tin closet (on sides if room – otherwise on floor – leave rug area clear until last minute)',
                'Place Fabric Softener sheets (3-4) on each mattress (not necessary on foam mattresses), then cover beds with sheets (stored in drawers of dressers in each room). Don\'t forget downstairs couch.',
                'Last things in Tin Closet: bed pillows and sofa pillows',
                'Close all windows',
              ]} />
            </div>
            <div>
              <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Closet off the Back Porch (COB) and Back Dock</h4>
              <Checklist id="bat-cob" items={[
                'Empty small kerosene can into larger blue can in the COB',
                'Take home all canned goods stored in COB',
                'Clean off back dock and store chairs in COB – leave Bobbie\'s chair on back dock',
                'Lock COB',
              ]} />
            </div>
            <div>
              <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Kitchen and Bathrooms</h4>
              <Checklist id="bat-kitchen" items={[
                'Take home what you brought – don\'t leave any canned goods (even if they are not yours!)',
                'Store all paper towels, toilet paper, tissues in upper left of Old Ice Box',
                'Store spices in tin can',
                'Collect and store all matches, candles and soap in tins',
                'Empty batteries from flash lights and leave on table at foot of stairs',
                'Burn Papers – collect and return all baskets',
                'Take trash and recycling to Dump – check current schedule for hours',
                'Scrub out and let dry kitchen trash barrels – then place new bags in each barrel (otherwise stuff gets thrown in without bags and we have to clean again)',
                'Scrub out refrigerator, empty out ice dishes. Turn off refrigerator and prop doors open',
                'Wash and put away all dishes, silver and pots and pans. Leave drain in sink and wipe off all counters',
                'Dump out all water jugs',
                'Turn off gas water heater',
                'Close all windows',
              ]} />
            </div>
          </div>
        </NestedSection>
        <NestedSection title="Loon Lodge — Opening" icon={DoorClosed} color="text-emerald-600 dark:text-emerald-400">
          <div className="text-sm">
            <Checklist id="loon-open" items={[
              'Gas',
              'Water',
              'Electric',
            ]} />
          </div>
        </NestedSection>
        <NestedSection title="Loon Lodge — Closing" icon={DoorClosed} color="text-purple-600 dark:text-purple-400">
          <div className="text-sm">
            <Checklist id="loon-close" items={[
              'Gas',
              'Water',
              'Electric',
              'Food',
              'Fridge',
              'Sign',
              'Flag',
            ]} />
          </div>
        </NestedSection>
      </div>
    ),
  },
  {
    id: 'electrical',
    icon: Zap,
    title: 'Electrical Systems',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30',
    content: (
      <div className="space-y-3">
        <NestedSection title="Solar Power — Start" icon={Zap} color="text-amber-600 dark:text-amber-400">
          <div className="text-sm text-stone-700 dark:text-stone-300 space-y-3">
            <ol className="list-decimal list-inside space-y-1">
              <li>Inspect battery box for critters; close box.<Img name="image5.jpg" alt="Battery box" className="mt-1" /></li>
              <li>Confirm Charge Controller LEDs are lit.<Img name="image13.jpg" alt="Charge Controller" className="mt-1" /></li>
              <li>Turn ALL Generator Load Panel breakers OFF (down).<Img name="image6.jpg" alt="Generator breakers" className="mt-1" /></li>
              <li>Connect red monitor wire if disconnected.<Img name="image16.jpg" alt="Red monitor wire" className="mt-1" /></li>
              <li>Rotate Charge Controller Battery Switch counter-clockwise two notches → Main Bank. Only one battery switch is wired and installed; move that same switch for this step and the next.<Img name="image1.jpg" alt="Charge controller switch" className="mt-1" /></li>
              <li>Switch Inverter Battery Switch to Main Bank (same single switch as the step above).</li>
              <li>Close Inverter Breaker (lever horizontal).<Img name="image11.jpg" alt="Inverter breaker" className="mt-1" /></li>
              <li>Turn inverter ON (power-save off); wait for "Inverter Power On Line" LED.<Img name="image2.jpg" alt="Inverter" className="mt-1" /></li>
              <li>Turn on Water Pump breaker in Solar Load Panel → pump runs then shuts off.<Img name="image3.jpg" alt="Solar breakers" className="mt-1" /></li>
              <li>Turn on desired cabin breakers in Solar Load Panel.</li>
            </ol>
          </div>
        </NestedSection>

        <NestedSection title="Solar Power — Close" icon={Zap} color="text-amber-600 dark:text-amber-400">
          <div className="text-sm text-stone-700 dark:text-stone-300 space-y-3">
            <ol className="list-decimal list-inside space-y-1">
              <li>All Solar Load Panel breakers OFF (down).<Img name="image3.jpg" alt="Solar breakers OFF" className="mt-1" /></li>
              <li>All Generator breakers OFF (down).<Img name="image6.jpg" alt="Generator breakers OFF" className="mt-1" /></li>
              <li>Inverter OFF (middle position — all lights must be out).<Img name="image2.jpg" alt="Inverter OFF" className="mt-1" /></li>
              <li>Open Inverter Breaker (yellow button → lever vertical).<Img name="image11.jpg" alt="Inverter breaker open" className="mt-1" /></li>
              <li>Rotate Charge Controller switch clockwise two notches → Aux Bank. Only one battery switch is wired and installed; move that same switch for this step and the next.<Img name="image1.jpg" alt="Charge controller aux" className="mt-1" /></li>
              <li>Inverter switch to Aux Bank (same single switch as the step above).</li>
              <li>Disconnect red monitor wire.<Img name="image16.jpg" alt="Red monitor wire disconnect" className="mt-1" /></li>
              <li>Connect the Battery Maintainer alligator clips to the generator battery posts and close its breaker (lever horizontal). The Battery Maintainer was blown at the end of 2021, so this step is currently void.
                <Img name="image14.jpg" alt="AGM batteries" className="mt-2" />
                <Img name="image15.jpg" alt="Sterling Auxiliary Battery Charge/Maintainer" className="mt-2" />
              </li>
            </ol>
          </div>
        </NestedSection>

        <NestedSection title="Resetting the Main Battery Bank (Battleborn BMS)" icon={Zap} color="text-amber-600 dark:text-amber-400">
          <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
            <p className="font-medium text-amber-800 dark:text-amber-300">Please call/text Neil Donnelly (<a href="tel:6038191058" className="underline">603-819-1058</a>) first if you're thinking of doing this.</p>
            <p>If the lithium batteries get close to a zero state of charge, the BMS may shut the main battery bank down completely. The inverter should shut down before the charge gets that low. If it does not, the BMS has to be reset (woken up).<Img name="image5.jpg" alt="Battery bank" className="mt-1" /></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Turn the Inverter <strong>OFF</strong>.</li>
              <li>Call Battleborn Tech Support at <a href="tel:7756223448" className="text-emerald-700 dark:text-emerald-400 hover:underline">775-622-3448</a> (Pacific Time).</li>
              <li>Jumper Aux + to Main + and Aux – to Main –.</li>
              <li>Turn both switches to 1&amp;2 (up).</li>
            </ol>
            <p className="text-xs text-stone-500 dark:text-stone-400">In 2024 a single jumper from the primary positive bus to the aux positive post raised voltage from ~4.5V to 23.5V.</p>
            <Img name="image8.jpg" alt="Battery status monitor" />
          </div>
        </NestedSection>

        <NestedSection title="Solar Monitoring & Tips" icon={Zap} color="text-amber-600 dark:text-amber-400">
          <div className="text-sm text-stone-700 dark:text-stone-300 space-y-3">
            <Img name="image17.jpg" alt="Solar panels and combiner box" className="mb-2" />
            <p>The 2021 Battery Monitoring System (disconnected for the winter) is Bluetooth-enabled. Use it to view current battery levels (%) and charge/discharge details. The Bluetooth connection only reaches about as far as the dining table in Loon Lodge.</p>
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
        </NestedSection>

        <NestedSection title="Generator (Propane)" icon={Flame} color="text-orange-600 dark:text-orange-400">
          <div className="space-y-3 text-sm text-stone-700 dark:text-stone-300">
            <div>
              <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Normal Use</h4>
              <p>Run ~10 minutes at least once every two weeks. The generator does not keep its own battery maintained while it is running. The Generator Battery Charger, plugged into the outlet under the desk (on the pump breaker), maintains it.</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Propane on, regulator green. Open primary tank first.<Img name="image4.jpg" alt="Propane regulator" className="mt-1" /></li>
                <li>Battery cables secure inside generator.<Img name="image9.jpg" alt="Generator battery" className="mt-1" /></li>
                <li>Charger plugged into the outlet under the desk (on the pump breaker), set to SLI / 10A.<Img name="image7.jpg" alt="Battery charger" className="mt-1" /></li>
                <li>Solar 'pump' breaker OFF → Generator 'pump' breaker ON.<Img name="image6.jpg" alt="Generator breakers" className="mt-1" /></li>
                <li>Generator switch: MANUAL or AUTOMATIC.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">If Generator Won't Start</h4>
              <p>Almost always battery. Tighten terminals. Charge via solar charger (Solar 'pump' ON) for 90+ minutes. Green 'Full' light may appear before ready — give it time.</p>
            </div>
            <div>
              <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Leaving Camp (Generator Shutdown)</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Inside the generator, turn the switch to <strong>OFF</strong>.</li>
                <li><strong>Disconnect the battery cables</strong> from the battery.</li>
                <li>Turn <strong>OFF</strong> all of the breakers on the Generator Breakers panel.</li>
              </ol>
            </div>
          </div>
        </NestedSection>

        <NestedSection title="Marine Radio" icon={Radio} color="text-sky-600 dark:text-sky-400">
          <div className="text-sm text-stone-700 dark:text-stone-300 space-y-2">
            <p>For the weather forecast, press the <strong>WX</strong> button. The radio automatically scans to the weather stations, typically channel <strong>7</strong>.</p>
            <p>The marine radio gets power from the desktop battery (the chunky metal attachments on the terminals). As of August 2024 it was disconnected because the battery maintainer is broken. The red and black clips from the Battery Maintainer are what keep that desktop battery healthy.</p>
          </div>
        </NestedSection>
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
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Dr. Fun — Covers</h4>
          <p>Seat covers at a minimum should be applied daily to protect from sun, dew, or rain.</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Full low cover</li>
            <li>Cabin walls</li>
            <li>Seat covers</li>
          </ul>
        </div>
        <p><strong>Gas fee:</strong> $25/round trip (log book + box on desk in Main House). First/last launch/retrieval of season paid by CRIC.</p>
        <p><strong>15hp:</strong> Must be in <strong>neutral</strong> before starting (starting in gear can strip the rewind). Short pull only — if you pull the handle all the way out it will get stuck and need finagling to rewind.</p>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Sunfish Sailboat</h4>
          <p>The sail and mast are on the wall-mounted rack on the left wall of the boathouse as you enter, stored in a 14&apos; long black protective bag. The daggerboard and tiller are in the boathouse. Matt Hamill sealed pinhole leaks in the hull in 2024.</p>
        </div>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Vagabond Sailboat</h4>
          <p>When safely tied up with the drain plug removed, the boat is designed to drain any rain or water that falls. It is stored on land by the canoe launch under a tarp to reduce weight in the boathouse.</p>
        </div>
        <p><strong>Boating safety:</strong> Proof of passing a boating safety class required for operators.</p>
        <p><strong>Propane fee:</strong> $6/night per adult (first 7 days), $3/night per adult (additional nights). No charge for young kids.</p>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-2">Closing Checklist</h4>
          <Checklist id="boats-closing" items={[
            '15 HP – clean out! Tie up in Boathouse',
            'Guide Boat – Tie up in Boathouse',
            'Make sure they are tied and bumpers out so they cannot bump – there may be hurricanes when wind comes in all directions',
            'Close outside Boathouse doors and fasten from inside',
            'Lock land-side padlock',
            'Blue Canoe – pull upon shore beside other boats and turn over',
            'Put away paddles, boat cushions and life vests in downstairs bedroom closet',
            'Birch-bark and Rec Canoes – put across beds in downstairs bedroom',
            'Yellow Kayak – put in living room (remember Porch Furniture has to come inside too)',
          ]} />
        </div>
      </div>
    ),
  },
  {
    id: 'propane',
    icon: Flame,
    title: 'Propane Ordering & Refills',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30',
    content: (
      <div className="text-sm text-stone-700 dark:text-stone-300 space-y-4">
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Birch&apos;s Lakeside General Store (PJ Birchenough)</h4>
          <p>
            PJ is willing to come to Chair Rock, pick up empty propane tanks, fill them, and return them. Text or call{' '}
            <a href="tel:8144401025" className="text-emerald-700 dark:text-emerald-400 hover:underline">814-440-1025</a>.
            Ask him to bill Debbie Donnelly (5 Pulpit Run, Amherst, NH 03031), or pay him and get a receipt for reimbursement.
          </p>
        </div>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Tripp Fuel &amp; Propane LLC (Gouverneur, NY)</h4>
          <p>
            <a href="tel:3152871245" className="text-emerald-700 dark:text-emerald-400 hover:underline">315-287-1245</a>
            {' · '}
            <a href="https://trippfuelsllc.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 dark:text-emerald-400 hover:underline">trippfuelsllc.com</a>
          </p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Call by <strong>Wednesday at the latest</strong> to schedule a tank refill, and call <strong>Thursday to re-confirm</strong>.</li>
            <li>Meet them at the boat landing on <strong>Friday</strong> at the assigned time with tanks upright. Their hose reaches the boat.</li>
            <li>They accept credit cards only. Debbie Donnelly&apos;s card is on file under <em>Debbie Donnelly / Chair Rock Island</em>. Sarah Ferguson and Dick Donnelly also have accounts. Give them those names at the landing.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">White 40lb Tank</h4>
          <p>There is a smaller white 40lb tank that is much easier to move around, plus an adaptor from a standard Type-1 propane tank to the threaded connection at the house. It can be refilled at Birch&apos;s.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'contacts',
    icon: Phone,
    title: 'Key Contacts',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30',
    defaultOpen: true,
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {[
          {
            name: 'Mike Hanley (boats)',
            phones: ['315-806-9899'],
            email: 'mhanley1712@gmail.com',
            note: 'Schoolteacher in Star Lake. Responsive to texts. Needs lead time to launch or pull Dr. Fun.',
          },
          { name: 'Matt Hamill (handyman)', phones: ['603-548-6429'] },
          {
            name: 'Dean Kerr (plumber)',
            phones: [
              { label: 'Cell', number: '315-408-4363' },
              { label: 'Landline', number: '315-848-2471' },
            ],
            note: 'Responsive to texts. The Donnellys coordinate seasonal water turn-on and line blow-out with him.',
          },
          { name: 'Brett Blackmer (electrician)', phones: ['315-408-5917'] },
          {
            name: 'Jon Davenport (JMD Contracting)',
            phones: ['315-854-5631'],
            email: 'dvnprtjon@yahoo.com',
            address: '178 Clinton St, Gouverneur, NY 13642',
          },
          { name: 'Nick Lamarre (tree guy)', phones: ['518-578-0980'] },
          { name: 'Battleborn (battery support)', phones: ['775-622-3448'], note: 'Pacific Time.' },
          { name: 'Neil Donnelly (solar/battery)', phones: ['603-819-1058'], note: 'Call or text first before resetting the main battery bank.' },
          { name: 'Sarge Boss (south shore — boats)', phones: ['941-276-5382'] },
          { name: 'Bob Safford (wild cliff point)', phones: ['610-715-4951'] },
          { name: 'Jimi Gardener (south shore — carpenter/boats)', phones: ['518-450-8689'] },
          { name: 'Bill Bragdon (buck — carpenter)', phones: ['484-222-1354'] },
          {
            name: "Birch's Lakeside General Store, Campground & Marina (PJ & Erica Birch)",
            phones: ['315-848-4500'],
            email: 'Lakesideoncranberry@gmail.com',
            website: 'https://www.lakesideoncranberry.com',
            address: '7140 State Rte 3, Cranberry Lake, NY 12927',
          },
          {
            name: 'PJ Birchenough (propane pickup)',
            phones: ['814-440-1025'],
            note: 'Picks up empty tanks at Chair Rock, fills them, and returns them. Bill Debbie Donnelly or get a receipt.',
          },
          {
            name: 'Tripp Fuel & Propane LLC',
            phones: ['315-287-1245'],
            website: 'https://trippfuelsllc.com',
            address: 'Gouverneur, NY',
            note: 'Call by Wednesday, re-confirm Thursday, and meet them Friday at the boat landing. Credit cards only; Debbie Donnelly’s card is on file under Debbie Donnelly / Chair Rock Island.',
          },
          { name: 'Val Kerr (house cleaner, via Dean)', phones: [], note: 'Contact through Dean Kerr.' },
        ].map((contact) => {
          const phones = (contact.phones || []).map((phone) => (typeof phone === 'string' ? { number: phone } : phone))
          return (
            <div key={contact.name} className="flex items-start gap-2 rounded-md border border-emerald-200/70 dark:border-emerald-900/40 bg-white/70 dark:bg-stone-900/40 p-3">
              <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-stone-800 dark:text-stone-200">{contact.name}</p>
                {phones.map((phone) => (
                  <a key={phone.number} href={`tel:${phone.number}`} className="block text-emerald-700 dark:text-emerald-400 hover:underline">
                    {phone.label ? `${phone.label}: ${phone.number}` : phone.number}
                  </a>
                ))}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="block text-emerald-700 dark:text-emerald-400 hover:underline break-all">{contact.email}</a>
                )}
                {contact.website && (
                  <a href={contact.website} target="_blank" rel="noopener noreferrer" className="block text-emerald-700 dark:text-emerald-400 hover:underline break-all">{contact.website.replace(/^https?:\/\//, '')}</a>
                )}
                {contact.address && <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{contact.address}</p>}
                {contact.note && <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{contact.note}</p>}
              </div>
            </div>
          )
        })}
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

      <div className="space-y-3">
        {sections.map((s) => (
          <GuideSection key={s.id} section={s} defaultOpen={s.defaultOpen} />
        ))}
      </div>

      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 p-5">
        <h2 className="font-semibold text-stone-800 dark:text-stone-200 mb-3">Full Cranberry Guide</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Open the live Google Doc maintained by Neil Donnelly, or scan the QR code.</p>
        <a href={GUIDE_DOC_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline mb-3">
          Open the full Cranberry Guide
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <Img name="image12.jpg" alt="QR Code to Cranberry Guide" className="max-w-[200px]" />
      </div>
    </div>
  )
}
