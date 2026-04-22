import { ArchivedIncidentsPage } from "../../general/ArchivedIncidentsPage";

export const ArchiveIncidents: React.FC = () => {
  return (
    <ArchivedIncidentsPage
      title="Incident Archive"
      description="Browse all incidents recorded across the system."
      detailPathBase="/dashboard/incidents"
      emptyMessage="No archived incidents found for barangay users."
    />
  );
};

export default ArchiveIncidents;