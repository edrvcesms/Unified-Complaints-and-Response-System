import { MapPin, Phone, Mail, FileText, Bell } from "lucide-react";
import type { BarangayAccountData } from "../../../types/barangay/barangayAccount";

interface BarangayCardProps {
  barangay: BarangayAccountData;
  onViewIncidents: (id: number) => void;
}

export const BarangayCard: React.FC<BarangayCardProps> = ({ barangay, onViewIncidents }) => {
  const hasNewIncidents = (barangay.new_forwarded_incident_count ?? 0) > 0;
  
  return (
    <div className={`bg-white rounded-lg border transition-all duration-200 hover:shadow-md ${
      hasNewIncidents 
        ? "border-orange-300 hover:border-orange-400 shadow-sm" 
        : "border-gray-200 hover:border-primary-300"
    }`}>
      <div className="p-6 space-y-4">
        {/* Header with notification badge */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {barangay.barangay_name}
          </h3>
          {hasNewIncidents && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full shrink-0">
              <Bell className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{barangay.new_forwarded_incident_count}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span>{barangay.barangay_address}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 shrink-0 text-gray-400" />
            <span>{barangay.barangay_contact_number}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 shrink-0 text-gray-400" />
            <span className="truncate">{barangay.barangay_email}</span>
          </div>
        </div>

        <button
          onClick={() => onViewIncidents(barangay.id)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            hasNewIncidents
              ? "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
              : "bg-primary-600 hover:bg-primary-700 focus:ring-primary-500"
          }`}
        >
          <FileText className="w-4 h-4" />
          View Incidents
          {hasNewIncidents && (
            <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
              {barangay.new_forwarded_incident_count} new
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
