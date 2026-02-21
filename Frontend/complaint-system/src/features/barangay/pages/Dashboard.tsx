// ─── Dashboard.tsx ────────────────────────────────────────────────────────────
// Root layout: Navbar + Sidebar + dynamic page content.
// Fetches all complaints once here and passes down to child pages.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBarangayStore } from "../../../store/authStore";
import { useComplaints } from "../../../hooks/useComplaints";
import type { ActivePage } from "../../../types/complaints/complaint";
import { Sidebar } from "../components/Sidebar";
import { DashboardPage } from "../components/DashboardPage";
import { ComplaintsPage } from "./Complaints";
// ── Hamburger icon ────────────────────────────────────────────────────────────
const HamburgerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const navigate  = useNavigate();
  const clearAuth = useBarangayStore((state) => state.clearBarangayAuth);

  const [activePage,   setActivePage]   = useState<ActivePage>("dashboard");
  const [sidebarOpen,  setSidebarOpen]  = useState<boolean>(false);

  // ── Fetch all complaints from your real API ─────────────────────────────────
  // React Query caches this — no prop drilling of setComplaints needed.
  // Status updates in ComplaintsPage invalidate this query automatically.
  const { data: complaints = [], isLoading, isError } = useComplaints();

  const handleLogout = async () => {
    await clearAuth();
    navigate("/login");
  };

  const pageLabel = activePage === "complaints" ? "Manage Complaints" : "Dashboard";

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden bg-gray-50">
      
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">

          {/* Mobile top bar with hamburger */}
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white
            border-b border-gray-100 sticky top-0 z-10">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <HamburgerIcon />
            </button>
            <p className="text-sm font-semibold text-gray-700">{pageLabel}</p>
          </div>

          {/* Error state */}
          {isError && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              Failed to load complaints. Please refresh the page.
            </div>
          )}

          {/* Page content */}
          <div className="p-4 sm:p-6 lg:p-8 max-w-screen-xl mx-auto">
            {activePage === "dashboard" ? (
              <DashboardPage
                complaints={complaints}
                isLoading={isLoading}
              />
            ) : (
              <ComplaintsPage
                complaints={complaints}
                isLoading={isLoading}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;