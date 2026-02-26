import { Route, Routes } from "react-router-dom"
import { LoginPage } from "./features/authentication/pages/Login"
import { Dashboard } from "./features/barangay/pages/Dashboard"
import { useAuthStore } from "./store/authStore"
import { NetworkProvider } from "./context/NetworkContext"
import { BarangayRoute, LguRoute, DepartmentRoute, AuthRoutes } from "./routes/ProtectedRoutes"
import { NotFound } from "./features/general/NotFound"
import { useEffect } from "react"
import LoadingIndicator from "./features/general/LoadingIndicator"
import Navbar from "./layouts/Navbar"
import DashboardLayout from "./layouts/BarangayDashboardLayout"
import LguDashboardLayout from "./layouts/LguDashboardLayout"
import DepartmentDashboardLayout from "./layouts/DepartmentDashboardLayout"
import { IncidentPage } from "./features/barangay/pages/Incident"
import { IncidentDetails } from "./features/barangay/pages/IncidentDetails"
import { IncidentComplaints } from "./features/barangay/pages/IncidentComplaints"
import { ComplaintDetails } from "./features/barangay/pages/ComplaintDetails"
import { LguDashboard } from "./features/lgu/pages/Dashboard"
import { LguIncidents } from "./features/lgu/pages/Incidents"
import { BarangayList } from "./features/lgu/pages/BarangayList"
import { BarangayIncidents } from "./features/lgu/pages/BarangayIncidents"
import { DepartmentDashboard } from "./features/department/pages/Dashboard"
// import { DepartmentIncidents } from "./features/department/pages/Incidents"

function App() {

  const refreshAccessToken = useAuthStore(state => state.refreshAccessToken);
  const isCheckingAuth = useAuthStore(state => state.isCheckingAuth);
  const isAuthenticated = useAuthStore(state => !!state.accessToken);
  const clearAuth = useAuthStore(state => state.clearAuth);

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
          {/* Barangay Official Routes */}
          <Route element={<BarangayRoute />}>
            <Route path="/dashboard/*" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="incidents" element={<IncidentPage />} />
              <Route path="incidents/:incidentId" element={<IncidentDetails />} />
              <Route path="incidents/:incidentId/complaints" element={<IncidentComplaints />} />
              <Route path="incidents/complaints/:id" element={<ComplaintDetails />} />
            </Route>
          </Route>

          {/* LGU Official Routes */}
          <Route element={<LguRoute />}>
            <Route path="/lgu/*" element={<LguDashboardLayout />}>
              <Route path="dashboard" element={<LguDashboard />} />
              <Route path="barangay-incidents" element={<BarangayList />} />
              <Route path="barangay-incidents/:barangayId" element={<BarangayIncidents />} />
              <Route path="incidents" element={<LguIncidents />} />
              {/* Additional LGU routes can be added here */}
            </Route>
          </Route>

          {/* Department Staff Routes */}
          <Route element={<DepartmentRoute />}>
            <Route path="/department/*" element={<DepartmentDashboardLayout />}>
              <Route path="dashboard" element={<DepartmentDashboard />} />
              {/* <Route path="incidents" element={<DepartmentIncidents />} /> */}
              {/* Additional department routes can be added here */}
            </Route>
          </Route>

          {/* Auth Routes (Login) */}
          <Route element={<AuthRoutes />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </NetworkProvider>
    </>
  )
}

export default App
