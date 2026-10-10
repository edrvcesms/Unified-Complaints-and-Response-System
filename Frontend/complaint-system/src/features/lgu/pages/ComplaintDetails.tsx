import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useComplaintDetails } from "../../../hooks/useComplaints";
import { ArrowLeft, AlertCircle, CalendarDays, FileText, Mail, MapPin, Paperclip, Phone, UserRound } from "lucide-react";
import { StatusBadge } from '../../barangay/components/StatusBadge';
import { AttachmentButton } from '../../barangay/components/AttachmentButton';
import LoadingIndicator from "../../general/LoadingIndicator";
import { useAuthStore } from "../../../store/authStore";
import { formatStatus } from "../../../utils/incidentHelpers";
import { formatDate } from "../../../utils/dateUtils";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { maskEmail, maskFullName, maskPhoneNumber } from "../../../utils/privacy";

const card = "bg-white border border-gray-200 rounded-xl shadow-sm p-5";

export const LguComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userRole = useAuthStore(state => state.userRole);
  const { t } = useTranslation();
  
  const { complaint, isLoading, error } = useComplaintDetails(Number(id));

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error || !complaint) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/lgu/incidents")}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <ArrowLeft size={16} />
          {t('btn.backIncidents')}
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="inline mr-2" size={18} />
          {error ? t('errors.loadComplaint') : t('errors.complaintNotFound')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          {t('btn.backComplaints')}
        </button>
        <span className="text-sm text-slate-500">{t('complaint.id', { id: complaint.id })}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 wrap-break-word">{complaint.title}</h1>
            <StatusBadge status={complaint.status} userRole={userRole || undefined} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-primary-50 text-sm font-medium text-primary-700 border border-primary-100">
              {formatCategoryName(complaint.category?.category_name)}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-orange-50 text-sm font-medium text-orange-700 border border-orange-100">Complaint details</span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-11 h-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <MapPin size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-slate-500">Location</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900 wrap-break-word">{complaint.location_details || t('frontend.complaints.noData')}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-11 h-11 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <UserRound size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-slate-500">Reported by</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900 wrap-break-word">
              {complaint.user ? maskFullName(`${complaint.user.first_name ?? ""} ${complaint.user.last_name ?? ""}`.trim()) : t('frontend.complaints.noData')}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarDays size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-slate-500">Submitted</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900">{formatDate(complaint.created_at, { year: 'numeric', month: 'numeric', day: 'numeric' })}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-11 h-11 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <FileText size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-slate-500">Status</dt>
            <dd className="mt-0.5 text-base font-semibold text-primary-700 capitalize">{formatStatus(complaint.status, userRole || undefined)}</dd>
          </div>
        </div>
      </dl>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <section className={`${card} lg:col-span-3`}>
          <h2 className="text-base font-semibold text-primary-700 mb-2">{t('frontend.complaints.description')}</h2>
          <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
        </section>

        <section className={`${card} lg:col-span-2`}>
          <h2 className="text-base font-semibold text-primary-700 mb-2">{t('frontend.complaints.additionalInfo')}</h2>
          <div className="space-y-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <Mail size={15} aria-hidden="true" />
                {t('frontend.complaints.reporterEmail')}
              </p>
              <p className="mt-0.5 text-base text-slate-900 wrap-break-word">{complaint.user?.email ? maskEmail(complaint.user.email) : t('frontend.complaints.noData')}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <Phone size={15} aria-hidden="true" />
                {t('frontend.complaints.reporterPhone')}
              </p>
              <p className="mt-0.5 text-base text-slate-900">{complaint.user?.phone_number ? maskPhoneNumber(complaint.user.phone_number) : t('frontend.complaints.noData')}</p>
            </div>
          </div>

          {complaint.attachment && complaint.attachment.length > 0 && (
            <div className="mt-6 pt-4 border-t border-primary-200">
              <h3 className="flex items-center gap-2 text-base font-semibold text-primary-700 mb-3">
                <Paperclip size={18} aria-hidden="true" />
                {t('frontend.complaints.attachments')} ({complaint.attachment.length})
              </h3>
              <div className="space-y-3">
                {complaint.attachment.map((attachment) => (
                  <AttachmentButton key={attachment.id} attachment={attachment} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
