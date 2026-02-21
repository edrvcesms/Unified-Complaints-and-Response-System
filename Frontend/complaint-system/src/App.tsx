import { Route, Routes } from "react-router-dom"
import { LoginPage } from "./features/authentication/pages/Login"
import { Dashboard } from "./features/barangay/pages/Dashboard"
import { useBarangayStore } from "./store/authStore"
import { NetworkProvider } from "./context/NetworkContext"
import { BarangayProtectedRoute } from "./routes/ProtectedRoutes"
import { NotFound } from "./features/general/NotFound"
import { useEffect } from "react"
import { AuthRoutes } from "./routes/ProtectedRoutes"
import LoadingIndicator from "./components/LoadingIndicator"

function App() {

  const refreshAccessToken = useBarangayStore(state => state.refreshAccessToken);
  const isLoading = useBarangayStore(state => state.isLoading);

  useEffect(() => {
    refreshAccessToken();
  }, [refreshAccessToken]);

  return isLoading ? <LoadingIndicator /> : (
    <>
      <NetworkProvider>
        <Routes>
          <Route element={<BarangayProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/complaints" element={<Dashboard />} />
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
