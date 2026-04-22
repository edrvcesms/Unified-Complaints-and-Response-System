import { ArchivedIncidentsPage } from "../../general/ArchivedIncidentsPage";

export const LguArchiveIncidents: React.FC = () => {
  return (
    <ArchivedIncidentsPage
      title="Incident Archive"
      description="Browse all incidents recorded across the system."
      detailPathBase="/lgu/incidents"
      emptyMessage="No archived incidents found for LGU users."
    />
  );
};

export default LguArchiveIncidents;