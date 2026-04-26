import { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, X } from "lucide-react";
import StaMariaLogo from "../assets/StaMariaLogo.jpg";
import { useUserRole } from "../hooks/useUserRole";
import { LanguageSwitcher } from "../features/general/LanguageSwitcher";
import { ConfirmationModal } from "../features/general/ConfirmationModal";
import { useConfirmationModal } from "../hooks/useConfirmationModal";
import { useNotifications as useNotificationData } from "../hooks/useNotification";
import { useToast } from "../hooks/useToast";
import { ToastContainer } from "../components/Toast";
import type { Notification } from "../types/notifications/notification";
import { formatDateTime, formatTimeAgo } from "../utils/dateUtils";


interface NavbarProps {
  onLogout: () => void;
}

const ROLES = {
  barangay_official: "Barangay Official",
  lgu_official: "LGU Official",
  department_staff: "Department Staff",
  superadmin: "Super Admin",
}


export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, getDisplayName } = useUserRole();

  const displayName = getDisplayName();

  const initials = displayName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const confirmationModal = useConfirmationModal();
  const { notifications, isLoading, markAsRead, markAllAsRead, refetch } = useNotificationData();
  const { toasts } = useToast();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent body scroll when mobile notification panel is open
  useEffect(() => {
    if (isMobile && notificationDropdownOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, notificationDropdownOpen]);

  const rejectedStatus = ["rejected_by_barangay", "rejected_by_department", "rejected_by_lgu"];
  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;
  const previewNotifications = (notifications ?? []).slice(0, 5);
  const isRejectNotification = (notification: Notification) => notification.notification_type === "complaint_rejected" || rejectedStatus.includes(notification.notification_type);

  const getRoutePrefix = () => {
    if (location.pathname.startsWith("/lgu")) return "/lgu";
    if (location.pathname.startsWith("/department")) return "/department";
    if (location.pathname.startsWith("/superadmin")) return "/superadmin";
    return "/dashboard";
  };

  const getNotificationsPagePath = () => {
    if (userRole === "barangay_official") return "/dashboard/notifications";
    if (userRole === "lgu_official") return "/lgu/notifications";
    if (userRole === "department_staff") return "/department/notifications";
    if (userRole === "superadmin") return "/superadmin/notifications";
    return `${getRoutePrefix()}/notifications`;
  };

  const getIncidentPath = (incidentId: number) => {
    if (userRole === "barangay_official") return `/dashboard/incidents/${incidentId}`;
    if (userRole === "lgu_official") return `/lgu/incidents/${incidentId}`;
    if (userRole === "department_staff") return `/department/incidents/${incidentId}`;

    // Fallback to current route context while auth role is still resolving.
    const prefix = getRoutePrefix();
    if (prefix === "/superadmin") return null;
    return `${prefix}/incidents/${incidentId}`;

    return null;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.incident_id) {
      const incidentPath = getIncidentPath(notification.incident_id);
      if (!incidentPath) return;
      setNotificationDropdownOpen(false);
      navigate(incidentPath);
    }
  };

  const handleViewAllNotifications = () => {
    setNotificationDropdownOpen(false);
    navigate(getNotificationsPagePath());
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      // Only close notification dropdown on outside click for desktop
      if (
        !isMobile &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(e.target as Node)
      ) {
        setNotificationDropdownOpen(false);
      }
    };

    if (dropdownOpen || notificationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, notificationDropdownOpen, isMobile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleBellClick = () => {
    setNotificationDropdownOpen((prev) => !prev);
    refetch();
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    confirmationModal.openModal({
      title: t('nav.logout'),
      message: t('nav.confirmLogout'),
      confirmText: t('nav.logout'),
      confirmColor: "red",
      onConfirm: () => onLogout(),
    });
  };

  // Shared notification list content
  const NotificationContent = () => (
    <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto overscroll-contain">
      {isLoading ? (
        <div className="px-5 py-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          <p className="text-sm text-gray-500">{t('nav.loadingNotifications')}</p>
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-gray-700">{t('nav.noNotifications')}</p>
          <p className="mt-1 text-xs text-gray-400">{t('nav.noNotificationsMessage')}</p>
        </div>
      ) : (
        <>
          {previewNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full border-b border-gray-100 px-4 sm:px-5 py-4 text-left transition active:bg-gray-100 hover:bg-gray-50 ${
                isRejectNotification(notification)
                  ? notification.is_read ? 'bg-red-50/60' : 'bg-red-50'
                  : notification.is_read ? 'bg-white' : 'bg-green-50/70'
              }`}
            >
              <div className="flex gap-3">
                {!notification.is_read && (
                  <div className={`mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full ${isRejectNotification(notification) ? 'bg-red-500' : 'bg-green-500'}`} />
                )}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isRejectNotification(notification) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isRejectNotification(notification) ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {isRejectNotification(notification) ? t('frontend.notifications.reject') : notification.notification_type.replace(/_/g, ' ')}
                    </span>
                    {!notification.is_read && (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                        {t('frontend.notifications.new')}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-medium leading-5 ${isRejectNotification(notification) ? 'text-red-900' : notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                    {notification.title}
                  </p>
                  <p className={`mt-1 line-clamp-2 text-xs leading-5 ${isRejectNotification(notification) ? 'text-red-700' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <p className={`${isRejectNotification(notification) ? 'text-red-600' : 'text-gray-500'}`}>
                      {t('frontend.notifications.sentAt')}: {formatDateTime(notification.sent_at)}
                    </p>
                    <p className={`${isRejectNotification(notification) ? 'text-red-500' : 'text-gray-400'}`}>
                      {formatTimeAgo(notification.sent_at)}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="border-t border-gray-100 bg-gradient-to-r from-white to-gray-50 px-5 py-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleViewAllNotifications}
                className="rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 hover:text-green-900 active:bg-green-200"
              >
                {t('nav.viewAllNotifications')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <ToastContainer toasts={toasts} />

      <header className="w-full bg-gradient-to-br from-[#006837] via-[#00994d] to-[#00b36b] shadow-lg shadow-primary-900/40 sticky top-0 z-50">
        <nav
          className="px-4 sm:px-6 lg:pr-8 h-16 sm:h-20 lg:h-24 flex items-center justify-between"
          role="navigation"
          aria-label={t('frontend.a11y.mainNavigation')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-13 sm:h-13 lg:w-16 lg:h-16 rounded-full overflow-hidden border-2 border-white/30 shrink-0 shadow-lg">
              <img
                src={StaMariaLogo}
                alt="Sta. Maria, Laguna Seal"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm sm:text-base lg:text-xl leading-tight truncate tracking-tight">
                {t('appInfo.municipality')}
              </p>
              <p className="text-green-300 text-[10px] sm:text-xs lg:text-sm leading-tight truncate tracking-widest uppercase font-medium mt-0.5">
                {t('appInfo.systemName')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">

            {/* Notification Bell */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                type="button"
                onClick={handleBellClick}
                aria-haspopup="true"
                aria-expanded={notificationDropdownOpen}
                aria-label={t('nav.notifications')}
                className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-green-600 transition duration-200 cursor-pointer"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* DESKTOP: dropdown panel */}
              {!isMobile && notificationDropdownOpen && (
                <div
                  role="menu"
                  aria-label={t('frontend.a11y.notificationsMenu')}
                  className="absolute right-0 mt-2 w-96 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/10 z-50"
                  style={{ animation: "fadeSlideDown 0.15s ease-out" }}
                >
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t('nav.notifications')}</p>
                      <p className="text-[11px] text-gray-500">{t('frontend.notifications.latest5Updates')}</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                      >
                        {t('nav.markAllRead')}
                      </button>
                    )}
                  </div>
                  <NotificationContent />
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                aria-label={t('frontend.a11y.openProfileMenu')}
                className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 cursor-pointer transition duration-200"
              >
                <div
                  aria-hidden="true"
                  className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-white text-green-600 flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0"
                >
                  {initials}
                </div>
                <span className="hidden sm:block text-white text-base font-medium max-w-40 truncate">
                  {displayName}
                </span>
                <svg
                  aria-hidden="true"
                  className={`w-4 h-4 text-green-200 transition-transform duration-200 shrink-0 ${dropdownOpen ? "rotate-180" : "rotate-0"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div
                  role="menu"
                  aria-label={t('frontend.a11y.profileMenu')}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                  style={{ animation: "fadeSlideDown 0.15s ease-out" }}
                >
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{ROLES[userRole as keyof typeof ROLES] || userRole || 'User'}</p>
                  </div>
                  <LanguageSwitcher />
                  <div className="h-px bg-gray-100 mx-4" />
                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition duration-150 text-left cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* MOBILE: full-screen overlay notification panel */}
      {isMobile && notificationDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            style={{ animation: "fadeIn 0.2s ease-out" }}
            onClick={() => setNotificationDropdownOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom sheet panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ animation: "slideUp 0.25s ease-out", maxHeight: "85vh" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-3">
              <div>
                <p className="text-base font-semibold text-gray-900">{t('nav.notifications')}</p>
                <p className="text-xs text-gray-500">{t('frontend.notifications.latest5Updates')}</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition active:bg-green-200"
                  >
                    {t('nav.markAllRead')}
                  </button>
                )}
                <button
                  onClick={() => setNotificationDropdownOpen(false)}
                  aria-label={t('frontend.a11y.closeNotifications')}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <NotificationContent />
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        confirmColor={confirmationModal.confirmColor}
        onConfirm={confirmationModal.confirm}
        onCancel={confirmationModal.closeModal}
        isLoading={confirmationModal.isLoading}
      />
    </>
  );
};

export default Navbar;