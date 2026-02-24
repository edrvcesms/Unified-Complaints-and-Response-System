import { FileText } from "lucide-react";
import type { Attachment } from "../../../types/general/attachment";
import { truncateFileName } from "../../../utils/fileNameFormatter";

interface AttachmentFileCardProps {
  attachment: Attachment;
  iconBgColor: string;
  iconColor: string;
  buttonText: string;
}

const AttachmentFileCard: React.FC<AttachmentFileCardProps> = ({ 
  attachment, 
  iconBgColor, 
  iconColor,
  buttonText 
}) => (
  <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center shrink-0`}>
        <FileText className={iconColor} size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p 
          className="font-medium text-gray-900 truncate" 
          title={attachment.file_name}
        >
          {truncateFileName(attachment.file_name, 35)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {(attachment.file_size / 1024).toFixed(2)} KB
        </p>
      </div>
      <a
        href={attachment.file_path}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
      >
        {buttonText}
      </a>
    </div>
  </div>
);

interface AttachmentViewerProps {
  attachment: Attachment;
}

export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({ attachment }) => {
  const fileType = attachment.file_type.toLowerCase();
  
  const renderAttachment = () => {
    // Image types
    if (fileType.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.file_name)) {
      return (
        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
          <img 
            src={attachment.file_path} 
            alt={attachment.file_name}
            className="w-full h-auto max-h-96 object-contain"
          />
        </div>
      );
    }
    
    // Video types
    if (fileType.includes('video') || /\.(mp4|webm|ogg|mov)$/i.test(attachment.file_name)) {
      return (
        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
          <video 
            controls 
            className="w-full h-auto max-h-96"
            src={attachment.file_path}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    
    // PDF types
    if (fileType.includes('pdf') || attachment.file_name.toLowerCase().endsWith('.pdf')) {
      return (
        <AttachmentFileCard 
          attachment={attachment}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          buttonText="View PDF"
        />
      );
    }
    
    // Word document types
    if (fileType.includes('word') || fileType.includes('document') || 
        /\.(doc|docx)$/i.test(attachment.file_name)) {
      return (
        <AttachmentFileCard 
          attachment={attachment}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          buttonText="Download"
        />
      );
    }
    
    // Generic file fallback
    return (
      <AttachmentFileCard 
        attachment={attachment}
        iconBgColor="bg-gray-100"
        iconColor="text-gray-600"
        buttonText="Download"
      />
    );
  };

  return (
    <div className="space-y-2">
      {renderAttachment()}
      <p className="text-xs text-gray-500">
        Uploaded: {new Date(attachment.uploaded_at).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
};
