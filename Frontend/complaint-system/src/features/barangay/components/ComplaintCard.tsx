import { useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { StatusBadge } from './StatusBadge';
import type { Complaint } from "../../../types/complaints/complaint";

interface ComplaintCardProps {
  complaint: Complaint;
  onClick: (id: number) => void;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const descriptionLength = complaint.description?.length || 0;
  const shouldShowViewMore = descriptionLength > 150;

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if the click was on the view more button
    const target = e.target as HTMLElement;
    if (target.closest('.view-more-btn')) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    } else {
      onClick(complaint.id);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">
            #{complaint.id} - {complaint.title}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {complaint.user
              ? `${complaint.user.first_name} ${complaint.user.last_name}`
              : "Unknown"}
          </p>
        </div>
        <StatusBadge status={complaint.status} />
      </div>
      <div className="mb-3">
        <p className={`text-xs text-gray-600 ${!isExpanded && shouldShowViewMore ? 'line-clamp-2' : ''}`}>
          {complaint.description}
        </p>
        {shouldShowViewMore && (
          <button
            className="view-more-btn text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'View Less' : 'View More'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <MapPin size={14} />
          <span className="truncate">{complaint.location_details || "N/A"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{new Date(complaint.created_at).toLocaleDateString("en-PH")}</span>
        </div>
      </div>
    </div>
  );
};
