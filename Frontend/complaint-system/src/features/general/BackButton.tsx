import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  label: string;
  onClick: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
};
