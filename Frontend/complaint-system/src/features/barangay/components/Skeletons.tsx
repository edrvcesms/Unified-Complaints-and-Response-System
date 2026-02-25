
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