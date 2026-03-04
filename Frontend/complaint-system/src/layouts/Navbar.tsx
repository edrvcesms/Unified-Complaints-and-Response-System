import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import StaMariaLogo from "../assets/StaMariaLogo.jpg";
import { useUserRole } from "../hooks/useUserRole";
import { LanguageSwitcher } from "../features/general/LanguageSwitcher";
import { ConfirmationModal } from "../features/general/ConfirmationModal";
import { useConfirmationModal } from "../hooks/useConfirmationModal";
import { useNotifications as useNotificationData } from "../hooks/useNotification";
import { useNotifications as useSSENotifications } from "../hooks/useNotifications";
import { useToast } from "../hooks/useToast";
import { ToastContainer } from "../components/Toast";
import type { Notification } from "../types/notifications/notification";
import { queryClient } from "../main";


interface NavbarProps {
  onLogout: () => void;
}

const ROLES = {
  barangay_official: "Barangay Official",
  lgu_official: "LGU Official",
  department_staff: "Department Staff",
}


export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
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

  const confirmationModal = useConfirmationModal();
  const { notifications, isLoading, markAsRead, markAllAsRead, refetch } = useNotificationData();
  const { toasts, showToast } = useToast();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  useSSENotifications({
    events: ['*'],
    onNotification: (notification) => {
      console.log('SSE Notification received:', notification);
      
      showToast({
        title: notification.data?.title || 'New Notification',
        message: notification.data?.message || 'You have a new notification',
        type: 'info',
        duration: 5000,
      });

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return notifDate.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate to complaint if complaint_id exists
    if (notification.complaint_id) {
      setNotificationDropdownOpen(false);
      navigate(`/dashboard/incidents/complaints/${notification.complaint_id}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(e.target as Node)) {
        setNotificationDropdownOpen(false);
      }
    };

    if (dropdownOpen || notificationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, notificationDropdownOpen]);

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

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate("/profile");
  };

  const handleBellClick = () => {
    setNotificationDropdownOpen((prev) => !prev);
    refetch();
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    confirmationModal.openModal({
      title: "Logout",
      message: "Are you sure you want to logout?",
      confirmText: "Logout",
      confirmColor: "red",
      onConfirm: () => onLogout(),
    });
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <header className="w-full bg-gradient-to-br from-[#003087] via-[#0055b3] to-[#0077cc] shadow-lg shadow-blue-950/40 sticky top-0 z-50">
      <nav
        className="px-4 sm:px-6 lg:pr-8 h-16 sm:h-20 lg:h-24 flex items-center justify-between"
        role="navigation"
        aria-label="Main navigation"
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
              Sta. Maria, Laguna
            </p>
            <p className="text-blue-300 text-[10px] sm:text-xs lg:text-sm leading-tight truncate tracking-widest uppercase font-medium mt-0.5">
              Unified Complaints and Response System
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
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-blue-600 transition duration-200 cursor-pointer"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationDropdownOpen && (
              <div
                role="menu"
                aria-label="Notifications menu"
                className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl
                  border border-gray-100 overflow-hidden z-50"
                style={{ animation: "fadeSlideDown 0.15s ease-out" }}
              >
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="px-5 py-8 text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                      <p className="text-sm text-gray-500">Loading notifications...</p>
                    </div>
                  ) : !notifications || notifications.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                      <p className="text-xs text-gray-400 mt-1">You'll see updates here when they arrive</p>
                    </div>
                  ) : (
                    <>
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition border-b border-gray-100
                            ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                        >
                          <div className="flex gap-3">
                            {!notification.is_read && (
                              <div className="shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTime(notification.sent_at)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            aria-label="Open profile menu"
            className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 cursor-pointer
              
              transition duration-200 "
          >
            <div
              aria-hidden="true"
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0"
            >
              {initials}
            </div>

            <span className="hidden sm:block text-white text-base font-medium max-w-40 truncate">
              {displayName}
            </span>

            <svg
              aria-hidden="true"
              className={`w-4 h-4 text-blue-200 transition-transform duration-200 shrink-0
                ${dropdownOpen ? "rotate-180" : "rotate-0"}`}
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
              aria-label="Profile menu"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl
                border border-gray-100 overflow-hidden z-50"
              style={{ animation: "fadeSlideDown 0.15s ease-out" }}
            >
              <style>{`
                @keyframes fadeSlideDown {
                  from { opacity: 0; transform: translateY(-6px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{ROLES[userRole as keyof typeof ROLES] || userRole || 'User'}</p>
              </div>

              <button
                role="menuitem"
                type="button"
                onClick={handleProfileClick}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700
                  hover:bg-blue-50 hover:text-blue-800 transition duration-150 text-left cursor-pointer"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </button>

              <div className="h-px bg-gray-100 mx-4" />

              <LanguageSwitcher />

              <div className="h-px bg-gray-100 mx-4" />

              <button
                role="menuitem"
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600
                  hover:bg-red-50 transition duration-150 text-left cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
          </div>
        </div>
      </nav>
    </header>

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