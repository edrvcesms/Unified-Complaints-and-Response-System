import './App.css'
import { Routes, Route } from 'react-router'
import { LoginPage } from './features/authentication/pages/Login'

function App() {
  return(
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </>
  )
}

export default App
