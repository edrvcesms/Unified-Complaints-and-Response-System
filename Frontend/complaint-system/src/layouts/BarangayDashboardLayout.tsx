import { Sidebar } from "../features/barangay/components/Sidebar";
import { DashboardLayout } from "./DashboardLayout";

export const BarangayDashboardLayout: React.FC = () => (
  <DashboardLayout SidebarComponent={Sidebar} />
);

export default BarangayDashboardLayout;