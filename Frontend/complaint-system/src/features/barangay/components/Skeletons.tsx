
export const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
    <div className="space-y-2">
      <div className="h-6 w-12 bg-gray-100 rounded" />
      <div className="h-3 w-24 bg-gray-100 rounded" />
    </div>
  </div>
);

export const SkeletonComplaintCard = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1">
        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
      </div>
      <div className="h-6 w-20 bg-gray-200 rounded" />
    </div>
    <div className="mb-3 space-y-2">
      <div className="h-3 w-full bg-gray-200 rounded" />
      <div className="h-3 w-5/6 bg-gray-200 rounded" />
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 w-24 bg-gray-200 rounded" />
      <div className="h-3 w-20 bg-gray-200 rounded" />
    </div>
  </div>
);

export const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
      </td>
    ))}
  </tr>
);

export const SkeletonChart = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
    {/* fake title */}
    <div className="h-3 w-32 bg-gray-100 rounded mb-6" />
    {/* fake bars */}
    <div className="flex items-end justify-between gap-2 h-44 px-2">
      {[55, 80, 40, 95, 60, 75, 45].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-100 rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
    {/* fake x-axis labels */}
    <div className="flex justify-between gap-2 mt-3 px-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex-1 h-2 bg-gray-100 rounded" />
      ))}
    </div>
  </div>
);

export const SkeletonPieChart = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
    {/* fake title */}
    <div className="h-3 w-28 bg-gray-100 rounded mb-6" />
    <div className="flex items-center justify-between gap-6">
      {/* fake donut */}
      <div className="relative w-36 h-36 shrink-0">
        <div className="w-36 h-36 rounded-full bg-gray-100" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white" />
        </div>
      </div>
      {/* fake legend */}
      <div className="flex-1 space-y-3">
        {[70, 55, 85, 45].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gray-100 shrink-0" />
            <div className="h-2.5 bg-gray-100 rounded" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);