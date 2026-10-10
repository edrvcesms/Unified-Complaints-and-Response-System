import { Calendar, MessageSquare, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../ErrorMessage";
import { useFeedbacks } from "../../../hooks/useFeedbacks";
import { useAuthStore } from "../../../store/authStore";
import { Pagination } from "../../barangay/components/Pagination";
import { GridCardSkeleton } from "../../barangay/components/Skeletons";
import { maskFullName } from "../../../utils/privacy";

const FEEDBACKS_PER_PAGE = 6;

interface PaginationQueryParams {
  page: number;
  page_size: number;
  search?: string;
}

const getDisplayName = (firstName?: string | null, lastName?: string | null) => {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();
  return fullName ? maskFullName(fullName) : "Anonymous User";
};

const getFormattedDate = (rawDate: string) => {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const firstInitial = (firstName || "").trim().charAt(0);
  const lastInitial = (lastName || "").trim().charAt(0);
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();
  return initials || "AU";
};

const renderStars = (rating: number) => {
  const roundedRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-3.5 w-3.5 ${value <= roundedRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        />
      ))}
    </div>
  );
};

export const FeedbacksPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userRole = useAuthStore((state) => state.userRole);
  const [metaData, setMetaData] = useState<PaginationQueryParams>({ page: 1, page_size: FEEDBACKS_PER_PAGE });
  const { feedbacks, isLoading, isFetching, error } = useFeedbacks({ page: metaData.page, page_size: metaData.page_size });
  const [currentPage, setCurrentPage] = useState(1);

  const totalFeedbacks = feedbacks?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalFeedbacks / FEEDBACKS_PER_PAGE));
  const getIncidentPath = (incidentId: number) => {
    const routePrefix = userRole === "lgu_official" ? "/lgu" : "/dashboard";
    return `${routePrefix}/incidents/${incidentId}`;
  };

  const handlePageChange = (page: number) => {
    setMetaData((prev) => ({ ...prev, page }));
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [totalFeedbacks]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedFeedbacks = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) return [];
    const start = (currentPage - 1) * FEEDBACKS_PER_PAGE;
    const end = start + FEEDBACKS_PER_PAGE;
    return feedbacks.slice(start, end);
  }, [feedbacks, currentPage]);

  if (error) {
    return <ErrorMessage message={t('errors.failedToLoadMessage')} />;
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t('frontend.feedbacks.headerTitle')}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {t('frontend.feedbacks.headerDescription')}
            </p>
          </div>

          {!isLoading && (
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {t('frontend.feedbacks.totalCount', { count: totalFeedbacks })}
            </div>
          )}
        </div>
      </header>

      {isLoading || isFetching ? (
        <GridCardSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Center the no feedbacks yet if there are none */}
          {totalFeedbacks === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white py-10 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                <MessageSquare className="h-5 w-5 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">{t('frontend.feedbacks.noPostIncident')}</p>
              <p className="mt-1 text-sm text-slate-500">{t('frontend.feedbacks.emptyHint')}</p>
            </div>
          ) : (
            paginatedFeedbacks.map((feedback) => (
              <button
                type="button"
                key={feedback.id}
                onClick={() => navigate(getIncidentPath(feedback.incident_id))}
                className="flex min-h-[148px] w-full flex-col rounded-xl border border-gray-200 bg-white p-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-semibold text-primary-700">
                        {getInitials(feedback.user?.first_name, feedback.user?.last_name)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {getDisplayName(feedback.user?.first_name, feedback.user?.last_name) || t('frontend.feedbacks.anonymousUser')}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {feedback.ratings?.toFixed(1)}
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    {renderStars(feedback.ratings)}
                    <span className="truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {feedback.incident?.title?.trim() || `${t('frontend.feedbacks.incidentPrefix')} #${feedback.incident_id}`}
                    </span>
                  </div>

                  <p className="line-clamp-2 min-h-[2.5rem] whitespace-pre-wrap text-sm font-medium leading-5 text-gray-700">
                    {feedback.message?.trim() || t('frontend.feedbacks.noMessageProvided')}
                  </p>

                  <div className="mt-auto flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {getFormattedDate(feedback.created_at) || t('frontend.feedbacks.unknownDate')}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}

          {totalPages > 1 && (
            <div className="col-span-full mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default FeedbacksPage;
