interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
  border?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  color, 
  bg, 
  border = "border-gray-200", 
  icon,
  onClick,
}) => {
  if (!icon) {
    return (
      <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{value}</p>
      </div>
    );
  }

  return (
    <div
    className={`flex min-w-0 items-center gap-3 rounded-lg border-2 ${border} bg-white p-3 sm:gap-4 sm:p-4 lg:p-5 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${bg}`}>
        <span className={`${color} [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-6 sm:[&_svg]:w-6`}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold leading-tight text-gray-900 sm:text-2xl">{value}</p>
        <p className="mt-0.5 break-words text-xs font-medium text-gray-600 sm:text-sm">{label}</p>
      </div>
    </div>
  );
};
