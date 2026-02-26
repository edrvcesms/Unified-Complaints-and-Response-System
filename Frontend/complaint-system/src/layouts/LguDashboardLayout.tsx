import { LguSidebar } from "../features/lgu/components/LguSidebar";
import { DashboardLayout } from "./DashboardLayout";

export const LguDashboardLayout: React.FC = () => (
  <DashboardLayout SidebarComponent={LguSidebar} />
);

export default LguDashboardLayout;
