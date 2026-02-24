import React from "react";

const LoadingIndicator: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      {/* Spinner rings */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003087] animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#003087] animate-spin [animation-duration:600ms] [animation-direction:reverse]" />
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-slate-400 tracking-wide">Please wait</span>
      </div>
    </div>
  );
};

export default LoadingIndicator;