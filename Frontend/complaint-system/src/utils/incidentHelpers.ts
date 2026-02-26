export const getSeverityColor = (severity: string): string => {
  const severityMap: Record<string, string> = {
    LOW: "bg-green-100 text-green-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-orange-100 text-orange-800",
    VERY_HIGH: "bg-red-100 text-red-800",
  };
  return severityMap[severity] || "bg-gray-100 text-gray-800";
};

export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    resolved: "bg-green-100 text-green-800",
    under_review: "bg-blue-100 text-blue-800",
    submitted: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-orange-100 text-orange-800",
    pending: "bg-gray-100 text-gray-800",
  };
  return statusMap[status.toLowerCase()] || "bg-gray-100 text-gray-800";
};

export const formatStatus = (status: string): string => {
  if (!status) return "N/A";
  return status.replace("_", " ").toUpperCase();
};
