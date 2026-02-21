// ─── components/Sidebar.tsx ───────────────────────────────────────────────────
import type { ActivePage } from "../../../types/complaints/complaint";

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ComplaintsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { id: "complaints", label: "Manage Complaints", icon: <ComplaintsIcon /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const handleNav = (page: ActivePage) => {
    onNavigate(page);
    onClose();
  };

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
        className={`
            fixed top-[65px] left-0 h-[calc(100vh-65px)] w-64 z-30
            bg-white border-r border-gray-200
            flex flex-col transition-transform duration-300 ease-in-out
            lg:sticky lg:top-[0px] lg:h-[calc(100vh-65px)] lg:translate-x-0 lg:z-auto
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        aria-label="Sidebar navigation"
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Navigation</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-150 text-left group
                  ${isActive
                    ? "bg-blue-700 text-white shadow-sm shadow-blue-200"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-800"
                  }
                `}
              >
                <span className={isActive ? "text-white" : "text-gray-400 group-hover:text-blue-600"}>
                  {item.icon}
                </span>
                {item.label}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400" />}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Sta. Maria, Laguna<br />
            <span className="font-medium">Complaint Management System</span>
          </p>
        </div>
      </aside>
    </>
  );
};