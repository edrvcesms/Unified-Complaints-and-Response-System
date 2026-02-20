import { Route, Routes } from "react-router-dom"
import { LoginPage } from "./features/authentication/pages/Login"
import { Dashboard } from "./features/barangay/pages/Dashboard"
import { useBarangayStore } from "./store/authStore"
import { NetworkProvider } from "./context/NetworkContext"
import { BarangayProtectedRoute } from "./routes/ProtectedRoutes"
import { NotFound } from "./features/general/NotFound"
import { useEffect } from "react"
import { AuthRoutes } from "./routes/ProtectedRoutes"

function App() {

  useEffect(() => {
    useBarangayStore.getState().refreshAccessToken();
  }, [])

  return(
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
