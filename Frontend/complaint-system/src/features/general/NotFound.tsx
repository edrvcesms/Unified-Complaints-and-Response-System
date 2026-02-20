import React from "react";
import { useNavigate } from "react-router-dom";

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/dashboard")
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-black text-gray-200 select-none">404</h1>
        <div className="-mt-10">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">
            Page Not Found
          </h2>
          <p className="text-blue-500 mb-8 max-w-sm mx-auto">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
          <a
            onClick={() => handleClick()}
            className="inline-flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};
