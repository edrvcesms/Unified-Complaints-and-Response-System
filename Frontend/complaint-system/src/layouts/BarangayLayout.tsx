import { Navbar } from "../components/Navbar";
import { useBarangayStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const navigate = useNavigate();
  const clearBarangayAuth = useBarangayStore((state) => state.clearBarangayAuth);

  const handleLogout = async () => {
    await clearBarangayAuth();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onLogout={handleLogout} />
      {/* rest of dashboard */}
    </div>
  );
};