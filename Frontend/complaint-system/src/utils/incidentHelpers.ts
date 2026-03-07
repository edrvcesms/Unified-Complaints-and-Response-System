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
  
  const statusMap: Record<string, string> = {
    resolved: "bg-green-100 text-green-800",
    resolved_by_department: "bg-green-100 text-green-800",
    resolved_by_barangay: "bg-green-100 text-green-800",
    under_review: "bg-blue-100 text-blue-800",
    reviewed_by_department: "bg-blue-100 text-blue-800",
    reviewed_by_barangay: "bg-blue-100 text-blue-800",
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
  
  // Handle forwarded statuses - generalized
  if (lowerStatus === 'forwarded_to_lgu' || lowerStatus === 'forwarded_to_department') {
    return "FORWARDED";
  }
  
  // Handle resolved statuses
  if (lowerStatus === 'resolved_by_department' || lowerStatus === 'resolved_by_barangay') {
    return "RESOLVED";
  }
  
  // Handle reviewed/under review statuses
  if (lowerStatus === 'reviewed_by_department' || lowerStatus === 'reviewed_by_barangay') {
    return "UNDER REVIEW";
  }
  
  return status.replace(/_/g, " ").toUpperCase();
};
