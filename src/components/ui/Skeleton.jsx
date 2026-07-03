export function SkeletonCard() {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm border border-stone-200 animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-1/3 mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-stone-100 rounded w-full" />
        <div className="h-3 bg-stone-100 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonWeather() {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm border border-stone-200 animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-1/4 mb-4" />
      <div className="flex gap-4">
        <div className="h-12 w-12 bg-stone-200 rounded" />
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-stone-100 rounded w-1/2" />
          <div className="h-3 bg-stone-100 rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-stone-200 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </div>
  )
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="h-8 w-8 bg-stone-200 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-stone-200 rounded w-2/3" />
            <div className="h-2 bg-stone-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
