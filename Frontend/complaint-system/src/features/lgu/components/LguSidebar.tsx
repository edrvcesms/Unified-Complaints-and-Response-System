import { Sidebar as GenericSidebar } from "../../general";
import { DashboardIcon, ComplaintsIcon, AnnouncementsIcon } from "../../barangay/components/Icons";
import { MapPin, FileText } from "lucide-react";

interface LguSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { path: "/lgu/dashboard", label: "Dashboard", icon: <DashboardIcon />, end: true },
  { path: "/lgu/barangay-incidents", label: "Barangay Incidents", icon: <MapPin className="w-5 h-5" /> },
  { path: "/lgu/incidents", label: "Forwarded Incidents", icon: <ComplaintsIcon /> },
  { path: "/lgu/monthly-reports", label: "Monthly Barangay Reports", icon: <FileText className="w-5 h-5" /> },
  { path: "/lgu/announcements", label: "Announcements", icon: <AnnouncementsIcon /> },
];

export const LguSidebar: React.FC<LguSidebarProps> = ({ isOpen, onClose }) => (
  <GenericSidebar
    isOpen={isOpen}
    onClose={onClose}
    navItems={NAV_ITEMS}
    navigationLabel="LGU Navigation"
    footerText="Local Government Unit"
  />
);
