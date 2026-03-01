import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAllBarangays } from "../../../hooks/useBarangays";
import { BarangayCard } from "../components/BarangayCard";
import { StatCard, ErrorMessage, SearchInput } from "../../general";
import LoadingIndicator from "../../general/LoadingIndicator";

export const BarangayList: React.FC = () => {
  const { barangays, isLoading, error } = useAllBarangays();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBarangays = useMemo(() => {
    if (!barangays) return [];
    if (!searchTerm.trim()) return barangays;
    
    return barangays.filter((barangay) =>
      barangay.barangay_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [barangays, searchTerm]);

  if (error) {
    return <ErrorMessage message="Failed to load barangays. Please refresh." />;
  }

  if (isLoading) {
    return <LoadingIndicator />;
  }

  const handleViewIncidents = (barangayId: number) => {
    navigate(`/lgu/barangay-incidents/${barangayId}`);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barangay Incidents</h1>
          <p className="text-sm text-gray-600 mt-1">View incidents forwarded from each barangay</p>
        </div>
        <StatCard label="Total Barangays" value={barangays?.length || 0} />
      </div>

      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search barangays..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBarangays && filteredBarangays.length > 0 ? (
          filteredBarangays.map((barangay) => (
            <BarangayCard 
              key={barangay.id}
              barangay={barangay}
              onViewIncidents={handleViewIncidents}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            {searchTerm ? "No barangays match your search." : "No barangays found."}
          </div>
        )}
      </div>
    </div>
  );
};
