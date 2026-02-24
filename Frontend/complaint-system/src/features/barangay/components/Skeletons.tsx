
export const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
    <div className="space-y-2">
      <div className="h-6 w-12 bg-gray-100 rounded" />
      <div className="h-3 w-24 bg-gray-100 rounded" />
    </div>
  </div>
);

export const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
      </td>
    ))}
  </tr>
);