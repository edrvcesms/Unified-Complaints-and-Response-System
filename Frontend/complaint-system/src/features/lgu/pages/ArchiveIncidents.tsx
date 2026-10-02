import { ArchivedIncidentsPage } from "../../general/pages/ArchivedIncidentsPage";
import { useTranslation } from "react-i18next";

export const LguArchiveIncidents: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ArchivedIncidentsPage
      title={t('archive.title')}
      description={t('archive.description')}
      detailPathBase="/lgu/incidents"
      emptyMessage={t('archive.emptyLgu')}
    />
  );
};

export default LguArchiveIncidents;