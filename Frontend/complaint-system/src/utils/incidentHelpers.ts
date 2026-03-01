export const getSeverityColor = (severity: string): string => {
  const severityMap: Record<string, string> = {
    LOW: "bg-green-100 text-green-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-orange-100 text-orange-800",
    VERY_HIGH: "bg-red-100 text-red-800",
  };
  return severityMap[severity] || "bg-gray-100 text-gray-800";
};

export const getStatusColor = (status: string, userRole?: string): string => {
  const lowerStatus = status.toLowerCase();
  
  // For LGU and Department staff, treat forwarded statuses as unresolved
  if ((userRole === 'lgu_official' || userRole === 'department_staff') && 
      (lowerStatus === 'forwarded_to_lgu' || lowerStatus === 'forwarded_to_department')) {
    return "bg-yellow-100 text-yellow-800";
  }
  
  const statusMap: Record<string, string> = {
    resolved: "bg-green-100 text-green-800",
    under_review: "bg-blue-100 text-blue-800",
    submitted: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-orange-100 text-orange-800",
    pending: "bg-gray-100 text-gray-800",
    forwarded_to_lgu: "bg-orange-100 text-orange-800",
    forwarded_to_department: "bg-orange-100 text-orange-800",
  };
  return statusMap[lowerStatus] || "bg-gray-100 text-gray-800";
};

export const formatStatus = (status: string, userRole?: string): string => {
  if (!status) return "N/A";
  
  const lowerStatus = status.toLowerCase();
  
  // For LGU and Department staff, show forwarded statuses as UNRESOLVED
  if ((userRole === 'lgu_official' || userRole === 'department_staff') && 
      (lowerStatus === 'forwarded_to_lgu' || lowerStatus === 'forwarded_to_department')) {
    return "UNRESOLVED";
  }
  
  return status.replace(/_/g, " ").toUpperCase();
};
