import { Calendar, MapPin, User, Building2, Tag } from "lucide-react";
import type { Complaint } from "../../../types/complaints/complaint";
import { formatCategoryName } from "../../../utils/categoryFormatter";

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  iconColor: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, label, value, bgColor, iconColor }) => (
  <div className="flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
      <span className={iconColor}>{icon}</span>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 truncate" title={value}>
        {value}
      </p>
    </div>
  </div>
);

interface ComplaintInfoGridProps {
  complaint: Complaint;
}

export const ComplaintInfoGrid: React.FC<ComplaintInfoGridProps> = ({ complaint }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
    <InfoCard
      icon={<Tag size={20} />}
      label="Category"
      value={formatCategoryName(complaint.category?.category_name)}
      bgColor="bg-blue-100"
      iconColor="text-blue-600"
    />
    
    <InfoCard
      icon={<MapPin size={20} />}
      label="Barangay"
      value={complaint.barangay?.barangay_name || "N/A"}
      bgColor="bg-purple-100"
      iconColor="text-purple-600"
    />
    
    <InfoCard
      icon={<Building2 size={20} />}
      label="Department"
      value={complaint.department?.department_name || "N/A"}
      bgColor="bg-green-100"
      iconColor="text-green-600"
    />
    
    <InfoCard
      icon={<User size={20} />}
      label="Reported by"
      value={
        complaint.user 
          ? `${complaint.user.first_name} ${complaint.user.last_name}`
          : "Unknown"
      }
      bgColor="bg-orange-100"
      iconColor="text-orange-600"
    />
    
    <InfoCard
      icon={<Calendar size={20} />}
      label="Created"
      value={new Date(complaint.created_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
      bgColor="bg-yellow-100"
      iconColor="text-yellow-600"
    />
    
    <InfoCard
      icon={<MapPin size={20} />}
      label="Location"
      value={complaint.location_details || "N/A"}
      bgColor="bg-red-100"
      iconColor="text-red-600"
    />
  </div>
);
