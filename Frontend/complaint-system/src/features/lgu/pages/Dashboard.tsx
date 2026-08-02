import { useAllForwardedIncidents } from "../../../hooks/useIncidents";
import { LguDashboardPage } from "../components/LguDashboardPage";
import { useTranslation } from "react-i18next";

export const LguDashboard: React.FC = () => {
  const { incidents, isLoading, error: isError, pagination } = useAllForwardedIncidents({ page: 1, page_size: 10 });
  const { t } = useTranslation();

  return (
    <>
      {isError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {t('errors.failedToLoadMessage')}
        </div>
      )}
      <LguDashboardPage incidents={incidents || []} isLoading={isLoading} />
    </>
  );
};

export default LguDashboard;
