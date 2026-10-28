import { ScrollText, Landmark, FileText, AlertCircle } from 'lucide-react'

const sections = [
  {
    id: 'bylaws',
    icon: ScrollText,
    title: 'Bylaws of the Chair Rock Island Corporation',
    subtitle: 'Core provisions with practical amendments from 2012 onward',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-900/30',
    content: (
      <div className="space-y-4 text-sm text-stone-700 dark:text-stone-300">
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200">Article I — Place of Business</h3>
          <p>The principal office shall be at Cranberry Lake, St. Lawrence County, New York, or such other place as designated by the Board of Directors.</p>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200">Article II — Meetings of Shareholders</h3>
          <div className="space-y-2 mt-2">
            <p><strong>Section 1. Annual Meeting.</strong> Held on the first Monday in August at 2:00 pm at the principal office or other designated place.</p>
            <p><strong>Section 2. Special Meetings.</strong> Called by majority of Directors, the President, or upon written request of 1/3 of voting shares.</p>
            <p><strong>Sections 3–8.</strong> Standard provisions for notice (10–50 days), quorum (majority), voting (one vote per share), proxies (11-month limit), consent without meeting, and order of business apply.</p>
          </div>
        </div>
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 p-3 text-xs">
          <p className="font-medium text-amber-800 dark:text-amber-300">Note on Amendments:</p>
          <p className="text-amber-700 dark:text-amber-400 mt-1">The 2012 minutes describe a major generational share/dues restructure that has been implemented in practice (a share and a vote at 30, reduced dues before full cousin-unit dues, and opt-out provisions). Current dollar amounts, including the 50% increase effective 2025, are in Share Structure &amp; Dues. The formal updated Bylaws text reflecting these changes is not in the provided records.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'shares',
    icon: Landmark,
    title: 'Share Structure & Dues',
    subtitle: 'Current rates after the 50% increase approved November 2024 (effective 2025)',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/30',
    content: (
      <div className="space-y-3 text-sm text-stone-700 dark:text-stone-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded bg-white dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-700">
            <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">Cousin Units</p>
            <p className="text-lg font-bold text-stone-800 dark:text-stone-200 mt-1">$1,725/yr</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">$1,500/yr base + $225/yr boat fund. Up from $1,000 base + $150 boat fund.</p>
          </div>
          <div className="rounded bg-white dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-700">
            <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">Ages 30+ (non-shareholders)</p>
            <p className="text-lg font-bold text-stone-800 dark:text-stone-200 mt-1">$750 or $375</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">$750/yr (½ dues) if visiting the island, or $375/yr (¼ dues) if not visiting.</p>
          </div>
          <div className="rounded bg-white dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-700">
            <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">Ages 22–29 (young adults)</p>
            <p className="text-lg font-bold text-stone-800 dark:text-stone-200 mt-1">$150/yr</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">If visiting. Up from $100/yr.</p>
          </div>
          <div className="rounded bg-white dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-700">
            <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">Under 22</p>
            <p className="text-lg font-bold text-stone-800 dark:text-stone-200 mt-1">Free</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">No dues.</p>
          </div>
        </div>
        <div className="rounded-md bg-white dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-700">
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Cousin Units (9 families)</h4>
          <p>$1,500/yr base + $225/yr boat fund ($1,725/yr total). Bobbie &amp; Rod were released from dues in 2019. At 30, a family member may receive a share and a vote.</p>
        </div>
        <div className="rounded-md bg-white dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-700">
          <h4 className="font-medium text-stone-800 dark:text-stone-200 mb-1">Opt-out / Opt-in Rules</h4>
          <p>Shareholders may opt out (shares return to corporation). One share = one vote. When a shareholder dies, share returns to corporation. Opting back in requires paying half of missed dues + majority Board vote (unanimous).</p>
        </div>
      </div>
    ),
  },
  {
    id: 'financial',
    icon: FileText,
    title: 'Financial History',
    subtitle: 'Through 2026, from Debbie Donnelly’s Treasurer’s Report (October 19, 2026; income and expenses corrected October 21, 2026)',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30',
    content: (
      <div className="space-y-4 text-sm text-stone-700 dark:text-stone-300">
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-2">Liquid Assets as of June 30, 2026</h3>
          <p className="mb-2">Wellington started in 2008 with $30,000 from Nelson&apos;s estate. Dividends from the 500 Index help cover operating expenses; Wellington dividends are usually reinvested.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Vanguard Wellington Fund:</strong> $170,427.34 (up from $156,133.17 on 6/30/25). Cost basis $60,000. 10.36% YTD / 16.28% 12-month return as of October 15, 2026.</li>
            <li><strong>Vanguard 500 Index Fund:</strong> $145,375.64 (up from $131,740.92 on 6/30/25). Cost basis $15,977.03. 12.71% YTD / 15.7% 12-month return as of October 15, 2026.</li>
            <li><strong>Community Bank, N.A. Checking:</strong> $24,974.04 (up from $18,920.36 on 6/30/25).</li>
            <li><strong>Total liquid assets (6/30/26):</strong> $340,777.02 (up from $306,794.45 on 6/30/25). Includes a $16,699.50 Boat Fund balance. Only $1,461 remains on the original $17,776 shortfall from the 2017 purchase of Dr. Fun.</li>
          </ul>
          <p className="mt-2">Walter Smith, Debbie Donnelly, and Sarah Ferguson are now all authorized signers on the Vanguard accounts, clearing the way for the Smiths&apos; $30,000 contribution from Ama&apos;s trust.</p>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-2">Operating Results</h3>
          <p>Most years operating income covers or slightly exceeds expenses. Net losses are driven by one-time capital expenditures. Dues were raised 50% in November 2024, effective 2025.</p>
          <div className="mt-3 rounded-md bg-white dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-700 space-y-1">
            <h4 className="font-medium text-stone-800 dark:text-stone-200">2024</h4>
            <p>Total income $17,905.78. Total expenses $26,851.42. Net loss <strong>-$8,945.64</strong> (windows, doors, and septic).</p>
          </div>
          <div className="mt-3 rounded-md bg-white dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-700 space-y-2">
            <h4 className="font-medium text-stone-800 dark:text-stone-200">2025 full-year actuals</h4>
            <p><strong>Total income: $23,517.66</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>$19,710.00 CRIC dues and propane contributions ($18,900 dues + $810 propane)</li>
              <li>$220.00 late fees</li>
              <li>$1,800.00 boat fund contributions</li>
              <li>$1,650.16 Vanguard 500 Index cash dividends</li>
              <li>$137.50 Dr. Fun usage surplus</li>
            </ul>
            <p><strong>Operating expenses: $14,895.60</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>$9,400.33 taxes ($5,152.98 Town, $4,222.35 School, $25 NYS Corp)</li>
              <li>$1,480.00 insurance ($266 Dr. Fun, $1,214 combined buildings and boathouse)</li>
              <li>$3,990.27 repairs and maintenance</li>
              <li>$25.00 boat club</li>
            </ul>
            <p><strong>Non-recurring expenses: $1,760.24</strong> for two new solar batteries, cables, and a usage monitor. Nothing was paid to JMD Contracting in 2025.</p>
            <p><strong>Total expenses: $16,655.84</strong></p>
            <p><strong>2025 net income: +$6,861.82</strong></p>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-2">Major Capital Items</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>2017:</strong> Pontoon boat $43,500 + solar system $4,000 + Main House water heater</li>
            <li><strong>2021:</strong> Lithium battery system $4,600</li>
            <li><strong>2023–2024:</strong> Bunkhouse windows/door + Main House foundation work</li>
            <li>Recurring: Dock work, log repairs, septic, propane infrastructure</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-2">Boat Fund</h3>
          <p>Pontoon purchased for $43,500 in 2017 (fund had $25,724; the purchase left a $17,776 shortfall). Cousin units contribute $225/yr, co-mingled in regular checking. Balance on June 30, 2026 was $16,699.50, with $1,461 still to recover on that original shortfall.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'gaps',
    icon: AlertCircle,
    title: 'Gaps & Recommendations',
    subtitle: 'Missing records and suggested actions',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30',
    content: (
      <div className="space-y-3 text-sm">
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-2">Missing Records</h3>
          <ul className="list-disc list-inside space-y-1 text-stone-700 dark:text-stone-300">
            <li><strong>2008 Meeting Minutes</strong> — Amy was secretary; Dan read them at the 2009 meeting. Noted by Secretary Sarah Ferguson in the 2026 agenda.</li>
            <li><strong>2012 Treasurer&apos;s Report and comments</strong> — Also noted as missing in the 2026 agenda.</li>
            <li><strong>2013</strong> — Highest priority (implementation year of generational share/dues changes)</li>
            <li><strong>2016, 2017</strong> — Still missing</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-2">Recommended Immediate Actions</h3>
          <ol className="list-decimal list-inside space-y-1 text-stone-700 dark:text-stone-300">
            <li>Locate or reconstruct the 2008 minutes, the 2012 treasurer&apos;s report, and the 2013 minutes (critical for share structure history).</li>
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
        <FileText className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Corporate Records</h1>
      </div>
      <p className="text-sm text-stone-500 dark:text-stone-400">Bylaws, financial history, and governance documents for Chair Rock Island Corporation.</p>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.id} id={s.id} className={`rounded-lg border p-5 ${s.bg}`}>
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <h2 className="font-semibold text-stone-800 dark:text-stone-200">{s.title}</h2>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{s.subtitle}</p>
            </div>
            {s.content}
          </div>
        ))}
      </div>
    </div>
  )
}
