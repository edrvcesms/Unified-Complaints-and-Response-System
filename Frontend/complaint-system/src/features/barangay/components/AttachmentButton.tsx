import { FileText, FileImage, FileVideo, File } from "lucide-react";
import type { Attachment } from "../../../types/general/attachment";
import { truncateFileName } from "../../../utils/fileNameFormatter";

const getFileIcon = (fileType: string, fileName: string) => {
  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileType.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) {
    return { Icon: FileImage, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Image' };
  }
  if (lowerFileType.includes('video') || /\.(mp4|webm|ogg|mov)$/i.test(fileName)) {
    return { Icon: FileVideo, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Video' };
  }
  if (lowerFileType.includes('pdf') || lowerFileName.endsWith('.pdf')) {
    return { Icon: FileText, color: 'text-red-600', bgColor: 'bg-red-100', label: 'PDF' };
  }
  return { Icon: File, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'File' };
};

interface AttachmentButtonProps {
  attachment: Attachment;
}

export const AttachmentButton: React.FC<AttachmentButtonProps> = ({ attachment }) => {
  const { Icon, color, bgColor, label } = getFileIcon(attachment.file_type, attachment.file_name);
  
  return (
    <a
      href={attachment.file_path}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
    >
      <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className={color} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={attachment.file_name}>
          {truncateFileName(attachment.file_name, 30)}
        </p>
        <p className="text-xs text-gray-500">
          {label} • {(attachment.file_size / 1024).toFixed(2)} KB
        </p>
      </div>
      <span className="text-xs text-blue-600 font-medium shrink-0">Open</span>
    </a>
  );
};
