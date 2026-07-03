import { ScrollText, Landmark, FileText, AlertCircle } from 'lucide-react'

const sections = [
  {
    id: 'bylaws',
    icon: ScrollText,
    title: 'Bylaws of the Chair Rock Island Corporation',
    subtitle: 'Core provisions with practical amendments from 2012 onward',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    content: (
      <div className="space-y-4 text-sm text-stone-700">
        <div>
          <h3 className="font-semibold text-stone-800">Article I — Place of Business</h3>
          <p>The principal office shall be at Cranberry Lake, St. Lawrence County, New York, or such other place as designated by the Board of Directors.</p>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800">Article II — Meetings of Shareholders</h3>
          <div className="space-y-2 mt-2">
            <p><strong>Section 1. Annual Meeting.</strong> Held on the first Monday in August at 2:00 pm at the principal office or other designated place.</p>
            <p><strong>Section 2. Special Meetings.</strong> Called by majority of Directors, the President, or upon written request of 1/3 of voting shares.</p>
            <p><strong>Sections 3–8.</strong> Standard provisions for notice (10–50 days), quorum (majority), voting (one vote per share), proxies (11-month limit), consent without meeting, and order of business apply.</p>
          </div>
        </div>
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs">
          <p className="font-medium text-amber-800">Note on Amendments:</p>
          <p className="text-amber-700 mt-1">The 2012 minutes describe a major generational share/dues restructure that has been implemented in practice (ages 22–30 pay $100; age 30 receive share + ½ dues; age 40 pay full dues; opt-out provisions). The formal updated Bylaws text reflecting these changes is not in the provided records.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'shares',
    icon: Landmark,
    title: 'Share Structure & Dues',
    subtitle: 'Generational restructure implemented since 2012',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    content: (
      <div className="space-y-3 text-sm text-stone-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded bg-white p-3 border border-stone-200">
            <p className="text-xs text-stone-400 uppercase tracking-wider">Age 22–30</p>
            <p className="text-lg font-bold text-stone-800 mt-1">$100/yr</p>
            <p className="text-xs text-stone-500">No share or vote</p>
          </div>
          <div className="rounded bg-white p-3 border border-stone-200">
            <p className="text-xs text-stone-400 uppercase tracking-wider">Age 30–40</p>
            <p className="text-lg font-bold text-stone-800 mt-1">½ Dues</p>
            <p className="text-xs text-stone-500">Receive share + vote at 30</p>
          </div>
          <div className="rounded bg-white p-3 border border-stone-200">
            <p className="text-xs text-stone-400 uppercase tracking-wider">Age 40+</p>
            <p className="text-lg font-bold text-stone-800 mt-1">Full Dues</p>
            <p className="text-xs text-stone-500">$1,500/yr (raised 50% in 2024)</p>
          </div>
        </div>
        <div className="rounded-md bg-white p-3 border border-stone-200">
          <h4 className="font-medium text-stone-800 mb-1">Cousin Units (9 families)</h4>
          <p>$1,000/yr base + $225/yr boat fund contribution. Bobbie & Rod released from dues in 2019.</p>
        </div>
        <div className="rounded-md bg-white p-3 border border-stone-200">
          <h4 className="font-medium text-stone-800 mb-1">Opt-out / Opt-in Rules</h4>
          <p>Shareholders may opt out (shares return to corporation). One share = one vote. When a shareholder dies, share returns to corporation. Opting back in requires paying half of missed dues + majority Board vote (unanimous).</p>
        </div>
      </div>
    ),
  },
  {
    id: 'financial',
    icon: FileText,
    title: 'Financial History',
    subtitle: 'Key trends drawn from available Treasurer Reports (2010–2025)',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    content: (
      <div className="space-y-4 text-sm text-stone-700">
        <div>
          <h3 className="font-semibold text-stone-800 mb-2">Vanguard Funds</h3>
          <p>Two main funds: <strong>Wellington</strong> (started 2008 with $30,000 from Nelson's estate) and <strong>500 Index</strong>. Combined approaching <strong>$300,000</strong> even after $10k withdrawal in late 2024. Dividends from 500 Index help cover operating expenses; Wellington dividends usually reinvested. Smiths' $30k contribution from Ama's trust in progress (not yet reflected as of mid-2025).</p>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 mb-2">Operating Results</h3>
          <p>Most years operating income covers or slightly exceeds expenses. Net losses driven by one-time capital expenditures. 2024: net loss of ~$14,700 (windows/doors + septic). Dues raised 50% in Nov 2024 (effective 2025).</p>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 mb-2">Major Capital Items</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>2017:</strong> Pontoon boat $43,500 + solar system $4,000 + Main House water heater</li>
            <li><strong>2021:</strong> Lithium battery system $4,600</li>
            <li><strong>2023–2024:</strong> Bunkhouse windows/door + Main House foundation work</li>
            <li>Recurring: Dock work, log repairs, septic, propane infrastructure</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 mb-2">Boat Fund</h3>
          <p>Pontoon purchased for $43,500 in 2017 (fund had $25,724). Cousin units continue $225/yr contributions. Co-mingled in regular checking.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'gaps',
    icon: AlertCircle,
    title: 'Gaps & Recommendations',
    subtitle: 'Missing records and suggested actions',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    content: (
      <div className="space-y-3 text-sm">
        <div>
          <h3 className="font-semibold text-stone-800 mb-2">Missing Annual Minutes</h3>
          <ul className="list-disc list-inside space-y-1 text-stone-700">
            <li><strong>2013</strong> — Highest priority (implementation year of generational share/dues changes)</li>
            <li><strong>2016, 2017</strong> — Still missing</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 mb-2">Recommended Immediate Actions</h3>
          <ol className="list-decimal list-inside space-y-1 text-stone-700">
            <li>Locate or reconstruct 2013 minutes (critical for share structure history).</li>
            <li>Confirm and formalize current Bylaws reflecting generational changes.</li>
            <li>Export/save the current Google Doc Handbook as PDF for archival.</li>
            <li>Request written update + estimate from John Davenport on foundation project status.</li>
            <li>Complete share ownership census and distribution map.</li>
            <li>Post the separate 1-page Quick Start / Emergency Reference in the pump house.</li>
          </ol>
        </div>
      </div>
    ),
  },
]

export default function RecordsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-emerald-700" />
        <h1 className="text-2xl font-bold text-stone-800">Corporate Records</h1>
      </div>
      <p className="text-sm text-stone-500">Bylaws, financial history, and governance documents for Chair Rock Island Corporation.</p>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.id} id={s.id} className={`rounded-lg border p-5 ${s.bg}`}>
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <h2 className="font-semibold text-stone-800">{s.title}</h2>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">{s.subtitle}</p>
            </div>
            {s.content}
          </div>
        ))}
      </div>
    </div>
  )
}
