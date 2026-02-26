import { Sidebar as GenericSidebar } from "../../general";
import { DashboardIcon, ComplaintsIcon } from "./Icons";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: <DashboardIcon />, end: true },
  { path: "/dashboard/incidents", label: "Manage Incidents", icon: <ComplaintsIcon /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => (
  <GenericSidebar
    isOpen={isOpen}
    onClose={onClose}
    navItems={NAV_ITEMS}
  />
);
