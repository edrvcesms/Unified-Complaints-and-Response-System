import { MessageSquare, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../ErrorMessage";
import { useFeedbacks } from "../../../hooks/useFeedbacks";
import { Pagination } from "../../barangay/components/Pagination";

const FEEDBACKS_PER_PAGE = 6;

const getDisplayName = (firstName?: string | null, lastName?: string | null) => {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();
  return fullName;
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
  const { feedbacks, isLoading, error } = useFeedbacks();
  const [currentPage, setCurrentPage] = useState(1);

  const totalFeedbacks = feedbacks?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalFeedbacks / FEEDBACKS_PER_PAGE));

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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-4 w-24 rounded bg-slate-200" />
              </div>
              <div className="mt-3 h-3 w-56 rounded bg-slate-100" />
              <div className="mt-4 h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-11/12 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {totalFeedbacks === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                <MessageSquare className="h-5 w-5 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">{t('frontend.feedbacks.noPostIncident')}</p>
              <p className="mt-1 text-sm text-slate-500">{t('frontend.feedbacks.emptyHint')}</p>
            </div>
          ) : (
            paginatedFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {getInitials(feedback.user?.first_name, feedback.user?.last_name)}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {getDisplayName(feedback.user?.first_name, feedback.user?.last_name) || t('frontend.feedbacks.anonymousUser')}
                        </p>
                        <p className="text-xs text-slate-500">{feedback.user?.email || t('frontend.feedbacks.noEmailProvided')}</p>
                        <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                          {t('frontend.feedbacks.incidentPrefix')}: {feedback.incident?.title?.trim() || `#${feedback.incident_id}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        <Star className="mr-1 h-3.5 w-3.5 fill-current" />
                        {feedback.ratings?.toFixed(1)} / 5
                      </div>
                      {renderStars(feedback.ratings)}
                      <p className="text-xs text-slate-500">{getFormattedDate(feedback.created_at) || t('frontend.feedbacks.unknownDate')}</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {feedback.message?.trim() || t('frontend.feedbacks.noMessageProvided')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}

          {totalFeedbacks > 0 && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default FeedbacksPage;
