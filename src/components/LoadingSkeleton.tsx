export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
      <div className="border-b border-zinc-200 px-4 py-3 bg-zinc-50 flex gap-4">
        {Array.from({ length: cols }).map((_, idx) => (
          <div key={idx} className="h-4 bg-zinc-200 rounded w-24 animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-4 py-3.5 flex items-center gap-4">
            {Array.from({ length: cols }).map((__, cIdx) => (
              <div
                key={cIdx}
                className="h-4 bg-zinc-100 rounded flex-1 animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-md grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 h-24 animate-pulse">
            <div className="h-3.5 w-24 bg-zinc-200 rounded mb-3" />
            <div className="h-7 w-16 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-md p-5 h-64 animate-pulse" />
        <div className="bg-white border border-zinc-200 rounded-md p-5 h-64 animate-pulse" />
      </div>
    </div>
  );
}
