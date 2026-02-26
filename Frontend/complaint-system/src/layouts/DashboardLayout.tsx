import { useState } from "react";
import { Outlet } from "react-router-dom";
import { HamburgerIcon } from "../features/barangay/components/Icons";

interface DashboardLayoutProps {
  SidebarComponent: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ SidebarComponent }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="flex overflow-hidden bg-gray-50"
      style={{ height: "calc(100dvh - var(--navbar-h))" }}
    >
      <div className="flex flex-1 overflow-hidden">
        <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto">
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <HamburgerIcon />
            </button>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
