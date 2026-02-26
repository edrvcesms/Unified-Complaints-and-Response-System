// ─── components/LguSidebar.tsx ───────────────────────────────────────────────────
import { NavLink } from "react-router-dom";
import { DashboardIcon, ComplaintsIcon } from "../../barangay/components/Icons";
import { MapPin } from "lucide-react";

interface LguSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const LGU_NAV_ITEMS: NavItem[] = [
  { path: "/lgu/dashboard", label: "Dashboard", icon: <DashboardIcon />, end: true },
  { path: "/lgu/barangay-incidents", label: "Barangay Incidents", icon: <MapPin className="w-5 h-5" /> },
  { path: "/lgu/incidents", label: "Forwarded Incidents", icon: <ComplaintsIcon /> },
];

export const LguSidebar: React.FC<LguSidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        style={{
          top: "var(--navbar-h)",
          height: "calc(100dvh - var(--navbar-h))",
        }}
        className={`
    fixed left-0 z-30 w-64
    lg:sticky lg:top-0 lg:h-full lg:z-auto lg:translate-x-0
    bg-white border-r border-gray-200
    flex flex-col transition-transform duration-300 ease-in-out
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
  `}
      >
        {/* Mobile close row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 lg:hidden">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pt-5 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            LGU Navigation
          </p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {LGU_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-150 text-left group
                ${isActive
                  ? "bg-blue-700 text-white shadow-sm shadow-blue-200"
                  : "text-gray-600 hover:bg-blue-50 hover:text-blue-800"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <span className={
                    isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-blue-600"
                  }>
                    {item.icon}
                  </span>

                  {item.label}

                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Sta. Maria, Laguna<br />
            <span className="font-medium">
              Local Government Unit
            </span>
          </p>
        </div>
      </aside>
    </>
  );
};
