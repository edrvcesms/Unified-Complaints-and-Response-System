import { useTranslation } from "react-i18next";

interface StatusBadgeProps {
  status: string;
  userRole?: string;
}

const getStatusConfig = (status: string, userRole?: string, t?: (key: string) => string) => {
  const STATUS_MAP_BARANGAY: Record<string, { label: string; classes: string; dot: string }> = {
    submitted:                { label: t?.('status.submitted') || "Submitted",              classes: "bg-gray-100 text-gray-800 border-green-200",   dot: "bg-gray-500"   },
    under_review:             { label: t?.('status.underReview') || "Under Review",           classes: "bg-blue-100 text-blue-800 border-blue-200",     dot: "bg-blue-500"   },
    resolved:                 { label: t?.('status.resolved') || "Resolved",               classes: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500"  },
    resolved_by_department:   { label: t?.('status.resolved') || "Resolved",               classes: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500"  },
    resolved_by_barangay:     { label: t?.('status.resolved') || "Resolved",               classes: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500"  },
    reviewed_by_department:   { label: t?.('status.underReview') || "Under Review",           classes: "bg-blue-100 text-blue-800 border-blue-200",     dot: "bg-blue-500"   },
    reviewed_by_barangay:     { label: t?.('status.underReview') || "Under Review",           classes: "bg-blue-100 text-blue-800 border-blue-200",     dot: "bg-blue-500"   },
    forwarded_to_lgu:         { label: t?.('status.forwarded') || "Forwarded",              classes: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500" },
    forwarded_to_department:  { label: t?.('status.forwarded') || "Forwarded",              classes: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500" },
  };
  
  const STATUS_MAP_LGU_DEPT: Record<string, { label: string; classes: string; dot: string }> = {
    submitted:                { label: t?.('status.submitted') || "Submitted",    classes: "bg-gray-100 text-gray-800 border-green-200",   dot: "bg-gray-500"   },
    under_review:             { label: t?.('status.underReview') || "Under Review", classes: "bg-blue-100 text-blue-800 border-blue-200",     dot: "bg-blue-500"   },
    resolved:                 { label: t?.('status.resolved') || "Resolved",     classes: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500"  },
    resolved_by_department:   { label: t?.('status.resolved') || "Resolved",     classes: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500"  },
    resolved_by_barangay:     { label: t?.('status.resolved') || "Resolved",     classes: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500"  },
    reviewed_by_department:   { label: t?.('status.underReview') || "Under Review", classes: "bg-blue-100 text-blue-800 border-blue-200",     dot: "bg-blue-500"   },
    reviewed_by_barangay:     { label: t?.('status.underReview') || "Under Review", classes: "bg-blue-100 text-blue-800 border-blue-200",     dot: "bg-blue-500"   },
    forwarded_to_lgu:         { label: t?.('status.forwarded') || "Forwarded",    classes: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500" },
    forwarded_to_department:  { label: t?.('status.forwarded') || "Forwarded",    classes: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500" },
  };
  
  const FALLBACK = { label: t?.('status.unknown') || "Unknown", classes: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
  
  // Use role-specific map
  const statusMap = (userRole === 'lgu_official' || userRole === 'department_staff') 
    ? STATUS_MAP_LGU_DEPT 
    : STATUS_MAP_BARANGAY;
  
  return statusMap[status] ?? FALLBACK;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, userRole }) => {
  const { t } = useTranslation();
  const config = getStatusConfig(status, userRole, t);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
      text-xs font-semibold border ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};