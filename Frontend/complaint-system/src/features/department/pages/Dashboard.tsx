import { useAssignedIncidents } from "../../../hooks/useDepartment";
import { DepartmentDashboardPage } from "../components/DepartmentDashboardPage";

export const DepartmentDashboard: React.FC = () => {
  const { incidents, isLoading, error: isError } = useAssignedIncidents();

  return (
    <>
      {isError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Failed to load assigned incidents. Please try again.
        </div>
      )}
      <DepartmentDashboardPage incidents={incidents || []} isLoading={isLoading} />
    </>
  );
};

export default DepartmentDashboard;
