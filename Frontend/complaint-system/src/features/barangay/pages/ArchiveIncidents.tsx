import { ArchivedIncidentsPage } from "../../general/pages/ArchivedIncidentsPage";
import { useTranslation } from "react-i18next";
import { BARANGAY_ARCHIVE_STATUS_FILTERS } from "../../../types/complaints/complaint";

export const ArchiveIncidents: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ArchivedIncidentsPage
      title={t('archive.title')}
      description={t('archive.description')}
      detailPathBase="/dashboard/incidents"
      emptyMessage={t('archive.emptyBarangay')}
      statusOptions={BARANGAY_ARCHIVE_STATUS_FILTERS}
    />
  );
};

export default ArchiveIncidents;