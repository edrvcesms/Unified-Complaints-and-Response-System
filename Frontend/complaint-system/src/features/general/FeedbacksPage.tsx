import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { useResolvedPostIncidentFeedbacks } from "../../hooks/useAppFeedback";
import { ErrorMessage } from "./ErrorMessage";
import { PageHeader } from "./PageHeader";
import type { PostIncidentFeedback } from "../../types/feedbacks/postIncidentFeedback";
import { Pagination } from "../barangay/components/Pagination";

const FEEDBACKS_PER_PAGE = 10;

interface FeedbacksPageProps {
  title: string;
  description: string;
  detailPathBase: string;
  emptyMessage?: string;
}

const formatName = (feedback: PostIncidentFeedback) => {
  const firstName = feedback.user.first_name || "";
  const lastName = feedback.user.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || feedback.user.email || `User #${feedback.user.id}`;
};

const RatingBadge: React.FC<{ rating: number }> = ({ rating }) => {
  const roundedRating = Number.isFinite(rating) ? rating.toFixed(1) : "0.0";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
      {roundedRating}
    </span>
  );
};

export const FeedbacksPage: React.FC<FeedbacksPageProps> = ({
  title,
  description,
  detailPathBase,
  emptyMessage = "No feedbacks found.",
}) => {
  const navigate = useNavigate();
  const { feedbacks, isLoading, error } = useResolvedPostIncidentFeedbacks();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredFeedbacks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return feedbacks || [];

    return (feedbacks || []).filter((feedback) => {
      const feedbackAuthor = formatName(feedback).toLowerCase();
      const incidentTitle = (feedback.incident.title || "").toLowerCase();
      const message = (feedback.message || "").toLowerCase();
      const feedbackId = String(feedback.id);
      const incidentId = String(feedback.incident_id);

      return (
        feedbackAuthor.includes(query) ||
        incidentTitle.includes(query) ||
        message.includes(query) ||
        feedbackId.includes(query) ||
        incidentId.includes(query)
      );
    });
  }, [feedbacks, search]);

  const totalPages = Math.max(1, Math.ceil(filteredFeedbacks.length / FEEDBACKS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedFeedbacks = useMemo(() => {
    const start = (currentPage - 1) * FEEDBACKS_PER_PAGE;
    const end = start + FEEDBACKS_PER_PAGE;
    return filteredFeedbacks.slice(start, end);
  }, [filteredFeedbacks, currentPage]);

  const totalFeedbacks = feedbacks?.length || 0;
  const averageRating = totalFeedbacks > 0
    ? (feedbacks || []).reduce((sum, feedback) => sum + feedback.ratings, 0) / totalFeedbacks
    : 0;

  if (error) {
    return <ErrorMessage message="Failed to load feedbacks. Please refresh the page." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Total Feedbacks</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalFeedbacks}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Average Rating</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Search feedbacks</label>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by user, incident, message, or ID"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="px-3 pt-2 text-[11px] text-gray-500 sm:hidden">
          Swipe horizontally to view all columns.
        </div>
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full min-w-[860px]">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Feedback ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Incident</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={6} className="px-4 py-6">
                      <div className="h-5 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedFeedbacks.map((feedback) => (
                  <tr key={feedback.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">#{feedback.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{formatName(feedback)}</div>
                      <div className="text-xs text-gray-500">{feedback.user.email || "No email provided"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <button
                        type="button"
                        onClick={() => navigate(`${detailPathBase}/${feedback.incident_id}`)}
                        className="text-left font-medium text-primary-600 hover:text-primary-700"
                      >
                        {feedback.incident.title || `Incident #${feedback.incident_id}`}
                      </button>
                      <div className="text-xs text-gray-500">Incident #{feedback.incident_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RatingBadge rating={feedback.ratings} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[320px]">
                      <p>{feedback.message || "No message provided"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(feedback.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};