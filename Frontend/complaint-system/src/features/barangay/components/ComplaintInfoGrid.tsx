import { Calendar, MapPin, User, Tag } from "lucide-react";
import type { Complaint } from "../../../types/complaints/complaint";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { formatDate } from "../../../utils/dateUtils";

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  iconColor: string;
  wrapValue?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, label, value, bgColor, iconColor, wrapValue = false }) => (
  <div className="flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
      <span className={iconColor}>{icon}</span>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold text-gray-900 ${wrapValue ? "wrap-break-word whitespace-normal" : "truncate"}`} title={value}>
        {value}
      </p>
    </div>
  </div>
);

interface ComplaintInfoGridProps {
  complaint: Complaint;
}

export const ComplaintInfoGrid: React.FC<ComplaintInfoGridProps> = ({ complaint }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
    <InfoCard
      icon={<Tag size={20} />}
      label="Category"
      value={formatCategoryName(complaint.category?.category_name)}
      bgColor=""
      iconColor="text-primary-600"
    />
    
    <InfoCard
      icon={<MapPin size={20} />}
      label="Location of Incident"
      value={complaint.location_details || "N/A"}
      bgColor=""
      iconColor="text-purple-600"
      wrapValue
    />
    
    <InfoCard
      icon={<User size={20} />}
      label="Reported by"
      value={
        complaint.user 
          ? `${complaint.user.first_name} ${complaint.user.last_name}`
          : "Unknown"
      }
      bgColor=""
      iconColor="text-orange-600"
    />
    
    <InfoCard
      icon={<Calendar size={20} />}
      label="Created"
      value={formatDate(complaint.created_at, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
      bgColor=""
      iconColor="text-yellow-600"
    />
      {/* Hearing date */}
      {((complaint as any).hearing_date || (complaint as any).incident?.hearing_date) && (
        <InfoCard
          icon={<Calendar size={20} />}
          label="Hearing Date"
          value={(complaint as any).hearing_date ? (complaint as any).hearing_date : (complaint as any).incident?.hearing_date}
          bgColor=""
          iconColor="text-teal-600"
        />
      )}

      {/* Hearing count */}
      {((complaint as any).incident?.hearing_count || (complaint as any).hearing_count) && (
        <InfoCard
          icon={<Calendar size={20} />}
          label="Hearing Count"
          value={(() => {
            const hc = (complaint as any).incident?.hearing_count ?? (complaint as any).hearing_count;
            if (!hc) return "0";
            if (hc === 1) return "First Hearing";
            if (hc === 2) return "Second Hearing";
            if (hc === 3) return "Third Hearing";
            return `${hc}th Hearing`;
          })()}
          bgColor=""
          iconColor="text-teal-600"
        />
      )}
  </div>
);
