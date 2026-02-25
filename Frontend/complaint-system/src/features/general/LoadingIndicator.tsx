import React from "react";

const LoadingIndicator: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      {/* Spinner rings */}
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-slate-400 tracking-wide">Please wait</span>
      </div>
    </div>
  );
};

export default LoadingIndicator;