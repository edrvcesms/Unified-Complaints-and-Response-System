import { useTranslation } from "react-i18next";
import { AlertTriangle, Bell, Clock3, MailOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../../hooks/useNotification";
import { useUserRole } from "../../../hooks/useUserRole";
import type { Notification } from "../../../types/notifications/notification";
import { formatDateTime, formatTimeAgo } from "../../../utils/dateUtils";
import LoadingIndicator from "../LoadingIndicator";

export const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();

  const isRejectNotification = (notification: Notification) => notification.notification_type === "reject";
  const totalNotifications = notifications?.length ?? 0;
  const unreadNotifications = notifications?.filter((notification) => !notification.is_read).length ?? 0;
  const rejectNotifications = notifications?.filter((notification) => isRejectNotification(notification)).length ?? 0;

  const getComplaintPath = (complaintId: number) => {
    if (userRole === "barangay_official") {
      return `/dashboard/incidents/complaints/${complaintId}`;
    }
    if (userRole === "lgu_official") {
      return `/lgu/incidents/complaints/${complaintId}`;
    }
    if (userRole === "department_staff") {
      return `/department/incidents/complaints/${complaintId}`;
    }
    return null;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.complaint_id) {
      const targetPath = getComplaintPath(notification.complaint_id);
      if (targetPath) {
        navigate(targetPath);
      }
    }
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-green-900/10 bg-gradient-to-br from-[#0b7a3a] via-[#10924a] to-[#0f6a35] text-white shadow-lg shadow-green-900/10">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at top right, rgba(255,255,255,0.25), transparent 35%), radial-gradient(circle at bottom left, rgba(255,255,255,0.12), transparent 30%)" }} />
        <div className="relative p-5 sm:p-6 lg:p-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-50">
              <Bell className="h-3.5 w-3.5" />
              Inbox
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t("nav.notifications")}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-green-50/90 sm:text-base">
              {t("nav.notificationsPageSubtitle")}
            </p>
          </div>

          {!!notifications?.length && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0f6a35] shadow-sm transition hover:bg-green-50"
            >
              {t("nav.markAllRead")}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-center gap-6 text-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{totalNotifications}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
              <MailOpen className="h-7 w-7" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-center gap-6 text-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unread</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{unreadNotifications}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock3 className="h-7 w-7" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-center gap-6 text-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reject alerts</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{rejectNotifications}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {!notifications || notifications.length === 0 ? (
          <div className="px-6 py-14 text-center sm:px-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
              <Bell className="h-8 w-8" />
            </div>
            <p className="text-base font-semibold text-gray-900">{t("nav.noNotifications")}</p>
            <p className="mt-1 text-sm text-gray-500">{t("nav.noNotificationsMessage")}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`w-full px-5 py-4 text-left transition hover:bg-gray-50 sm:px-6 ${isRejectNotification(notification)
                  ? notification.is_read
                    ? "bg-red-50/60"
                    : "bg-red-50"
                  : notification.is_read
                    ? "bg-white"
                    : "bg-green-50/70"
                }`}
              >
                <div className="flex gap-3 sm:gap-4">
                  {!notification.is_read && (
                    <div
                      className={`shrink-0 mt-2 h-2.5 w-2.5 rounded-full ${isRejectNotification(notification) ? "bg-red-500" : "bg-green-500"}`}
                    />
                  )}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isRejectNotification(notification) ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${isRejectNotification(notification) ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                        {isRejectNotification(notification) ? "Reject" : notification.notification_type.replace(/_/g, " ")}
                      </span>
                      {!notification.is_read && (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-700">
                          New
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium ${isRejectNotification(notification)
                        ? "text-red-900"
                        : notification.is_read
                          ? "text-gray-700"
                          : "text-gray-900"
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className={`text-xs mt-1 line-clamp-2 leading-5 ${isRejectNotification(notification) ? "text-red-700" : "text-gray-600"}`}>
                      {notification.message}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <p className={`font-medium ${isRejectNotification(notification) ? "text-red-600" : "text-gray-500"}`}>
                        Sent at: {formatDateTime(notification.sent_at)}
                      </p>
                      <p className={`${isRejectNotification(notification) ? "text-red-500" : "text-gray-400"}`}>
                        {formatTimeAgo(notification.sent_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
