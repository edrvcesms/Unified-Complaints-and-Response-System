import './App.css'
import { Register } from './features/authentication/pages/Register'
import { OtpVerification } from './features/authentication/pages/OtpVerification'
import { UserLogin } from './features/authentication/pages/UserLogin'
import { Routes, Route } from 'react-router'

function App() {
  return(
    <>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/otp-verification" element={<OtpVerification />} />
        <Route path="/login" element={<UserLogin />} />
      </Routes>
    </>
  )
}

export default App
