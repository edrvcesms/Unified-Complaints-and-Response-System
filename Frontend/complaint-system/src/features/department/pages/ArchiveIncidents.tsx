import { ArchivedIncidentsPage } from "../../general/ArchivedIncidentsPage";

export const DepartmentArchiveIncidents: React.FC = () => {
  return (
    <ArchivedIncidentsPage
      title="Incident Archive"
      description="Browse all incidents recorded across the system."
      detailPathBase="/department/incidents"
      emptyMessage="No archived incidents found for department users."
    />
  );
};

export default DepartmentArchiveIncidents;