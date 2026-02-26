import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StaMariaLogo from "../assets/StaMariaLogo.jpg";
import { useUserRole } from "../hooks/useUserRole";
import { LanguageSwitcher } from "../features/general/LanguageSwitcher";
import { ConfirmationModal } from "../features/general/ConfirmationModal";
import { useConfirmationModal } from "../hooks/useConfirmationModal";


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

  const confirmationModal = useConfirmationModal();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate("/profile");
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
      <header className="w-full bg-[#003087] shadow-lg shadow-blue-950/40 sticky top-0 z-50">
      {/* Gold accent bar */}
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 sm:h-20 lg:h-24 flex items-center justify-between"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* ── Left — Logo + System Name ── */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
          {/* Municipal seal — larger */}
          <div className="w-10 h-10 sm:w-13 sm:h-13 lg:w-16 lg:h-16 rounded-full overflow-hidden border-2 border-white/30 shrink-0 shadow-lg">
            <img
              src={StaMariaLogo}
              alt="Sta. Maria, Laguna Seal"
              className="w-full h-full object-cover"
            />
          </div>

          {/* System name */}
          <div className="min-w-0">
            <p className="text-white font-bold text-sm sm:text-base lg:text-xl leading-tight truncate tracking-tight">
              Sta. Maria, Laguna
            </p>
            <p className="text-blue-300 text-[10px] sm:text-xs lg:text-sm leading-tight truncate tracking-widest uppercase font-medium mt-0.5">
              Unified Complaints and Response System
            </p>
          </div>
        </div>

        {/* ── Right — Profile Dropdown ── */}
        <div className="relative shrink-0" ref={dropdownRef}>

          {/* Profile toggle button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            aria-label="Open profile menu"
            className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 cursor-pointer
              
              transition duration-200 "
          >
            {/* Avatar circle with initials — larger */}
            <div
              aria-hidden="true"
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0"
            >
              {initials}
            </div>

            {/* Barangay/User name */}
            <span className="hidden sm:block text-white text-base font-medium max-w-40 truncate">
              {displayName}
            </span>

            {/* Chevron */}
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

          {/* ── Dropdown Menu ── */}
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

              {/* User info header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{ROLES[userRole as keyof typeof ROLES] || userRole || 'User'}</p>
              </div>

              {/* Profile option */}
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

              {/* Language Switcher */}
              <LanguageSwitcher />

              <div className="h-px bg-gray-100 mx-4" />

              {/* Logout button */}
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
      </nav>
    </header>

      {/* Confirmation Modal */}
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