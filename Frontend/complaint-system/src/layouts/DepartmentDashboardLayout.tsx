import { DepartmentSidebar } from "../features/department/components/DepartmentSidebar";
import { DashboardLayout } from "./DashboardLayout";

export const DepartmentDashboardLayout: React.FC = () => (
  <DashboardLayout SidebarComponent={DepartmentSidebar} />
);

export default DepartmentDashboardLayout;
