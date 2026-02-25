import { Route, Routes } from "react-router-dom"
import { LoginPage } from "./features/authentication/pages/Login"
import { Dashboard } from "./features/barangay/pages/Dashboard"
import { useBarangayStore } from "./store/authStore"
import { NetworkProvider } from "./context/NetworkContext"
import { BarangayProtectedRoute } from "./routes/ProtectedRoutes"
import { NotFound } from "./features/general/NotFound"
import { useEffect } from "react"
import { AuthRoutes } from "./routes/ProtectedRoutes"
import LoadingIndicator from "./features/general/LoadingIndicator"
import Navbar from "./layouts/Navbar"
import DashboardLayout from "./layouts/DashboardLayout"
import { IncidentPage } from "./features/barangay/pages/Incident"
import { IncidentDetails } from "./features/barangay/pages/IncidentDetails"
import { IncidentComplaints } from "./features/barangay/pages/IncidentComplaints"
import { ComplaintDetails } from "./features/barangay/pages/ComplaintDetails"

function App() {

  const refreshAccessToken = useBarangayStore(state => state.refreshAccessToken);
  const isCheckingAuth = useBarangayStore(state => state.isCheckingAuth);
  const isAuthenticated = useBarangayStore(state => !!state.barangayAccessToken);
  const clearBarangayAuth = useBarangayStore(state => state.clearBarangayAuth);

  useEffect(() => {
    refreshAccessToken();
    
    console.log("app mounted");
  }, [refreshAccessToken]);

  if (isCheckingAuth) {
    return <LoadingIndicator/>;
  }
  return (
    <>
      {isAuthenticated && <Navbar onLogout={clearBarangayAuth} />}
      <NetworkProvider>
        <Routes>
          <Route element={<BarangayProtectedRoute />}>
            <Route path="/dashboard/*" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="incidents" element={<IncidentPage />} />
              <Route path="incidents/:incidentId" element={<IncidentDetails />} />
              <Route path="incidents/:incidentId/complaints" element={<IncidentComplaints />} />
              <Route path="incidents/complaints/:id" element={<ComplaintDetails />} />
            </Route>
          </Route>

          <Route element={<AuthRoutes />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </NetworkProvider>
    </>
  )
}

export default App
