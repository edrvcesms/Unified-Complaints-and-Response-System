import { useNavigate } from "react-router-dom";
import { useAllBarangays } from "../../../hooks/useBarangays";
import { BarangayCard } from "../components/BarangayCard";
import { StatCard, ErrorMessage, LoadingSpinner, PageHeader } from "../../general";

export const BarangayList: React.FC = () => {
  const { barangays, isLoading, error } = useAllBarangays();
  const navigate = useNavigate();

  if (error) {
    return <ErrorMessage message="Failed to load barangays. Please refresh." />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const handleViewIncidents = (barangayId: number) => {
    navigate(`/lgu/barangay-incidents/${barangayId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Barangay Incidents"
        description="View incidents forwarded from each barangay"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Barangays" value={barangays?.length || 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barangays && barangays.length > 0 ? (
          barangays.map((barangay) => (
            <BarangayCard 
              key={barangay.id}
              barangay={barangay}
              onViewIncidents={handleViewIncidents}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            No barangays found.
          </div>
        )}
      </div>
    </div>
  );
};
