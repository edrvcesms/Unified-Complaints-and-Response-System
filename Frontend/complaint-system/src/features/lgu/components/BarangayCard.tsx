import { MapPin, Phone, Mail, FileText } from "lucide-react";
import type { BarangayAccountData } from "../../../types/barangay/barangayAccount";

interface BarangayCardProps {
  barangay: BarangayAccountData;
  onViewIncidents: (id: number) => void;
}

export const BarangayCard: React.FC<BarangayCardProps> = ({ barangay, onViewIncidents }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {barangay.barangay_name}
        </h3>

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
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <FileText className="w-4 h-4" />
          View Incidents
        </button>
      </div>
    </div>
  );
};
