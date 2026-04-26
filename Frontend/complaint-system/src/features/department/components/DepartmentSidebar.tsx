import { useTranslation } from "react-i18next";
import { Sidebar as GenericSidebar } from "../../general";
import { Archive, MessageSquare } from "lucide-react";
import { DashboardIcon, ComplaintsIcon } from "../../barangay/components/Icons";

interface DepartmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  
  const NAV_ITEMS = [
    { path: "/department/dashboard", label: t('sidebar.department.dashboard'), icon: <DashboardIcon />, end: true, group: "Dashboard" },
    { path: "/department/incidents", label: t('sidebar.department.incidents'), icon: <ComplaintsIcon />, group: "Manage Incidents" },
    { path: "/department/archive", label: "Archive", icon: <Archive className="w-5 h-5" />, group: "Manage Incidents" },
    { path: "/department/feedbacks", label: "Feedbacks", icon: <MessageSquare className="w-5 h-5" />, group: "Manage Incidents" },
  ];

  return (
    <GenericSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={NAV_ITEMS}
      navigationLabel={t('sidebar.department.navLabel')}
      footerText={t('sidebar.department.footer')}
    />
  );
};
