import { Sidebar as GenericSidebar } from "../../general";
import { DashboardIcon, ComplaintsIcon } from "../../barangay/components/Icons";

interface DepartmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { path: "/department/dashboard", label: "Dashboard", icon: <DashboardIcon />, end: true },
  { path: "/department/incidents", label: "Assigned Incidents", icon: <ComplaintsIcon /> },
];

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({ isOpen, onClose }) => (
  <GenericSidebar
    isOpen={isOpen}
    onClose={onClose}
    navItems={NAV_ITEMS}
    navigationLabel="Department Navigation"
    footerText="Department Portal"
  />
);
