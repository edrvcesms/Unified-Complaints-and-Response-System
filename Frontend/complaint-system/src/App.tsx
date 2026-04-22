import { Route, Routes, Navigate } from "react-router-dom"
import { LoginPage } from "./features/authentication/pages/Login"
import { SuperAdminLoginPage } from "./features/authentication/pages/SuperAdminLogin"
import { ForgotPasswordPage } from "./features/authentication/pages/ForgotPassword"
import { Dashboard } from "./features/barangay/pages/Dashboard"
import { useAuthStore } from "./store/authStore"
import { NetworkProvider } from "./context/NetworkContext"
import { BarangayRoute, LguRoute, DepartmentRoute, AuthRoutes, SuperAdminRoute } from "./routes/ProtectedRoutes"
import { NotFound } from "./features/general/NotFound"
import { useEffect } from "react"
import LoadingIndicator from "./features/general/LoadingIndicator"
import Navbar from "./layouts/Navbar"
import DashboardLayout from "./layouts/BarangayDashboardLayout"
import LguDashboardLayout from "./layouts/LguDashboardLayout"
import DepartmentDashboardLayout from "./layouts/DepartmentDashboardLayout"
import SuperAdminDashboardLayout from "./layouts/SuperAdminDashboardLayout"
import { IncidentPage } from "./features/barangay/pages/Incident"
import { IncidentDetails } from "./features/barangay/pages/IncidentDetails"
import { IncidentComplaints } from "./features/barangay/pages/IncidentComplaints"
import { ArchiveIncidents as BarangayArchiveIncidents } from "./features/barangay/pages/ArchiveIncidents"
import { ComplaintDetails } from "./features/barangay/pages/ComplaintDetails"
import { AnnouncementsPage } from "./features/barangay/pages/Announcements"
import { EventsPage } from "./features/barangay/pages/Events"
import { LguDashboard } from "./features/lgu/pages/Dashboard"
import { LguIncidents } from "./features/lgu/pages/Incidents"
import { LguIncidentDetails } from "./features/lgu/pages/IncidentDetails"
import { LguIncidentComplaints } from "./features/lgu/pages/IncidentComplaints"
import { LguComplaintDetails } from "./features/lgu/pages/ComplaintDetails"
import { BarangayList } from "./features/lgu/pages/BarangayList"
import { BarangayIncidents } from "./features/lgu/pages/BarangayIncidents"
import { LguArchiveIncidents } from "./features/lgu/pages/ArchiveIncidents"
import { LguAnnouncements } from "./features/lgu/pages/Announcements"
import { MonthlyBarangayReports } from "./features/lgu/pages/MonthlyBarangayReports"
import { MonthlyReportDetails } from "./features/lgu/pages/MonthlyReportDetails"
import { CategoryIncidents } from "./features/lgu/pages/CategoryIncidents"
import { DepartmentDashboard, DepartmentIncidents, DepartmentIncidentDetails, DepartmentIncidentComplaints, DepartmentComplaintDetails } from "./features/department/pages"
import { DepartmentArchiveIncidents } from "./features/department/pages/ArchiveIncidents"
import { SuperAdminAccounts, SuperAdminCategories, SuperAdminEmergencyHotlines, SuperAdminVerifyUsers } from "./features/superadmin/pages"
import { NotificationsPage } from "./features/general/pages/NotificationsPage"
import KnowledgeBase from "./features/superadmin/pages/KnowledgeBase"
import 'mapbox-gl/dist/mapbox-gl.css';

function App() {

  const refreshAccessToken = useAuthStore(state => state.refreshAccessToken);
  const isCheckingAuth = useAuthStore(state => state.isCheckingAuth);
  const isAuthenticated = useAuthStore(state => !!state.accessToken);
  const userRole = useAuthStore(state => state.userRole);
  const clearAuth = useAuthStore(state => state.clearAuth);

  const getDefaultDashboardPath = (role: string | null) => {
    if (role === "lgu_official") return "/lgu/dashboard";
    if (role === "department_staff") return "/department/dashboard";
    if (role === "superadmin") return "/superadmin/accounts";
    return "/dashboard";
  };

  useEffect(() => {
    refreshAccessToken();
    
    console.log("app mounted");
  }, [refreshAccessToken]);

  if (isCheckingAuth) {
    return <LoadingIndicator/>;
  }
  return (
    <>
      {isAuthenticated && <Navbar onLogout={clearAuth} />}
      <NetworkProvider>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? getDefaultDashboardPath(userRole) : "/officials-login"}
                replace
              />
            }
          />
          {/* Barangay Official Routes */}
          <Route element={<BarangayRoute />}>
            <Route path="/dashboard/*" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="incidents" element={<IncidentPage />} />
              <Route path="archive" element={<BarangayArchiveIncidents />} />
              <Route path="incidents/:incidentId" element={<IncidentDetails />} />
              <Route path="incidents/:incidentId/complaints" element={<IncidentComplaints />} />
              <Route path="incidents/complaints/:id" element={<ComplaintDetails />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* LGU Official Routes */}
          <Route element={<LguRoute />}>
            <Route path="/lgu/*" element={<LguDashboardLayout />}>
              <Route path="dashboard" element={<LguDashboard />} />
              <Route path="barangay-incidents" element={<BarangayList />} />
              <Route path="barangay-incidents/:barangayId" element={<BarangayIncidents />} />
              <Route path="incidents" element={<LguIncidents />} />
              <Route path="archive" element={<LguArchiveIncidents />} />
              <Route path="incidents/:incidentId" element={<LguIncidentDetails />} />
              <Route path="incidents/:incidentId/complaints" element={<LguIncidentComplaints />} />
              <Route path="incidents/complaints/:id" element={<LguComplaintDetails />} />
              <Route path="monthly-reports" element={<MonthlyBarangayReports />} />
              <Route path="monthly-reports/:barangayId" element={<MonthlyReportDetails />} />
              <Route path="monthly-reports/:barangayId/category/:categoryName" element={<CategoryIncidents />} />
              <Route path="announcements" element={<LguAnnouncements />} />
              <Route path="notifications" element={<NotificationsPage />} />
              {/* Additional LGU routes can be added here */}
            </Route>
          </Route>

          {/* Department Staff Routes */}
          <Route element={<DepartmentRoute />}>
            <Route path="/department/*" element={<DepartmentDashboardLayout />}>
              <Route path="dashboard" element={<DepartmentDashboard />} />
              <Route path="incidents" element={<DepartmentIncidents />} />
              <Route path="archive" element={<DepartmentArchiveIncidents />} />
              <Route path="incidents/:incidentId" element={<DepartmentIncidentDetails />} />
              <Route path="incidents/:incidentId/complaints" element={<DepartmentIncidentComplaints />} />
              <Route path="incidents/complaints/:id" element={<DepartmentComplaintDetails />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* Super Admin Routes */}
          <Route element={<SuperAdminRoute />}>
            <Route path="/superadmin/*" element={<SuperAdminDashboardLayout />}>
              <Route index element={<SuperAdminAccounts />} />
              <Route path="accounts" element={<SuperAdminAccounts />} />
              <Route path="categories" element={<SuperAdminCategories />} />
              <Route path="emergency-hotlines" element={<SuperAdminEmergencyHotlines />} />
              <Route path="verify-users" element={<SuperAdminVerifyUsers />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
            </Route>
          </Route>

          {/* Auth Routes (Login) */}
          <Route element={<AuthRoutes />}>
            <Route path="/officials-login" element={<LoginPage />} />
            <Route path="/superadmin-login" element={<SuperAdminLoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </NetworkProvider>
    </>
  )
}

export default App
