import { useComplaints } from "../../../hooks/useComplaints";
import { DashboardPage } from "../components/dashboard/DashboardPage";

export const Dashboard: React.FC = () => {
  const { data: complaints = [], isLoading, isError } = useComplaints();

  return (
    <>
      {isError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Failed to load complaints. Please refresh the page.
        </div>
      )}
      <DashboardPage complaints={complaints} isLoading={isLoading} />
    </>
  );
};

export default Dashboard;