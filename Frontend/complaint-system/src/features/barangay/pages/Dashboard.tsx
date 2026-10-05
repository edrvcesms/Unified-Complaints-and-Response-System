import { useComplaintSummary, useComplaints } from "../../../hooks/useComplaints";
import { DashboardPage } from "../components/DashboardPage";
import { useTranslation } from "react-i18next";


export const Dashboard: React.FC = () => {
  const { complaints, isLoading, error: isError } = useComplaints();
  const { summary, isLoading: isSummaryLoading, error: summaryError } = useComplaintSummary();
  const { t } = useTranslation();

  return (
    <>
      {isError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {t('errors.failedToLoadMessage')}
        </div>
      )}
      {summaryError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {t('errors.failedToLoadMessage')}
        </div>
      )}
      <DashboardPage
        complaints={complaints || []}
        summary={summary}
        isLoading={isLoading || isSummaryLoading}
      />
    </>
  );
};

export default Dashboard;