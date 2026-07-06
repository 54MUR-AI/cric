export function SkeletonCard() {
  return (
    <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm border border-stone-200 dark:border-stone-700 animate-pulse">
      <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-full" />
        <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-3/4" />
        <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonWeather() {
  return (
    <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm border border-stone-200 dark:border-stone-700 animate-pulse">
      <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/4 mb-4" />
      <div className="flex gap-4">
        <div className="h-12 w-12 bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/2" />
          <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </div>
  )
}

export function SkeletonSidebar() {
  return (
    <div className="space-y-3 animate-pulse p-3">
      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mb-3" />
      <div className="space-y-2">
        {[3,4,2].map((w, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className="h-3.5 w-3.5 bg-stone-200 dark:bg-stone-700 rounded" />
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded" style={{ width: `${w}rem` }} />
          </div>
        ))}
      </div>
      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/4 my-3" />
      <div className="space-y-2">
        {[2,3].map((w, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className="h-3.5 w-3.5 bg-stone-200 dark:bg-stone-700 rounded" />
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded" style={{ width: `${w}rem` }} />
          </div>
        ))}
      </div>
      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/5 my-3" />
      <div className="flex items-center gap-2 py-1">
        <div className="h-3 w-6 bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-16" />
      </div>
    </div>
  )
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="h-8 w-8 bg-stone-200 dark:bg-stone-700 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-2/3" />
            <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
