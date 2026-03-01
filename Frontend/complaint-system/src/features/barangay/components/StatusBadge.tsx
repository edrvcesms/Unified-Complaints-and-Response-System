
interface StatusBadgeProps {
  status: string;
  userRole?: string;
}

const getStatusConfig = (status: string, userRole?: string) => {
  const STATUS_MAP_BARANGAY: Record<string, { label: string; classes: string; dot: string }> = {
    submitted:                { label: "Submitted",              classes: "bg-gray-100 text-gray-800 border-green-200",   dot: "bg-gray-500"   },
    under_review:             { label: "Under Review",           classes: "bg-blue-100 text-blue-800 border-blue-200",     dot: "bg-blue-500"   },
    resolved:                 { label: "Resolved",               classes: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500"  },
    forwarded_to_lgu:         { label: "Forwarded to LGU",       classes: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500" },
    forwarded_to_department:  { label: "Forwarded to Department", classes: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500" },
  };
  
  const STATUS_MAP_LGU_DEPT: Record<string, { label: string; classes: string; dot: string }> = {
    submitted:                { label: "Submitted",    classes: "bg-gray-100 text-gray-800 border-green-200",   dot: "bg-gray-500"   },
    under_review:             { label: "Under Review", classes: "bg-blue-100 text-blue-800 border-blue-200",     dot: "bg-blue-500"   },
    resolved:                 { label: "Resolved",     classes: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500"  },
    forwarded_to_lgu:         { label: "Unresolved",   classes: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-500" },
    forwarded_to_department:  { label: "Unresolved",   classes: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-500" },
  };
  
  const FALLBACK = { label: "Unknown", classes: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
  
  // Use role-specific map
  const statusMap = (userRole === 'lgu_official' || userRole === 'department_staff') 
    ? STATUS_MAP_LGU_DEPT 
    : STATUS_MAP_BARANGAY;
  
  return statusMap[status] ?? FALLBACK;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, userRole }) => {
  const config = getStatusConfig(status, userRole);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
      text-xs font-semibold border ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};