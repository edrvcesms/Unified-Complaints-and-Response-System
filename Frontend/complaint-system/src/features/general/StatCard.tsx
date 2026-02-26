interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
  border?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  color, 
  bg, 
  border = "border-gray-200", 
  icon 
}) => {
  if (!icon) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${border} p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
};
