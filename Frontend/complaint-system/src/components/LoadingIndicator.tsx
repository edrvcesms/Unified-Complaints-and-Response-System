import React from "react";

const LoadingIndicator: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      {/* Spinner rings */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-300 animate-spin [animation-duration:600ms] [animation-direction:reverse]" />
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-slate-400 tracking-wide">Please wait</span>
        <span className="flex gap-1 ml-1">
          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
};

export default LoadingIndicator;