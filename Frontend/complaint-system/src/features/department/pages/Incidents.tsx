import React from "react";

/**
 * Department Incidents Page
 * 
 * Displays incidents assigned to the department.
 * This is a placeholder that can be expanded with department-specific features.
 */

export const DepartmentIncidents: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Assigned Incidents
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Review and manage incidents assigned to your department
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Assigned Incidents</h3>
        <p className="mt-1 text-sm text-gray-500">
          Incident management features for your department will be available here.
        </p>
      </div>
    </div>
  );
};
