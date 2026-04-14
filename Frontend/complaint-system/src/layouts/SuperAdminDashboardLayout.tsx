import { SuperAdminSidebar } from "../features/superadmin/components/SuperAdminSidebar";
import { DashboardLayout } from "./DashboardLayout";

export const SuperAdminDashboardLayout: React.FC = () => (
  <DashboardLayout SidebarComponent={SuperAdminSidebar} />
);

export default SuperAdminDashboardLayout;
