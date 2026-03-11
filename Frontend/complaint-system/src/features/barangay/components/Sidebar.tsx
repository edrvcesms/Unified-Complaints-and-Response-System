import { useTranslation } from "react-i18next";
import { Sidebar as GenericSidebar } from "../../general";
import { DashboardIcon, ComplaintsIcon, AnnouncementsIcon } from "./Icons";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  
  const NAV_ITEMS = [
    { path: "/dashboard", label: t('sidebar.barangay.dashboard'), icon: <DashboardIcon />, end: true },
    { path: "/dashboard/incidents", label: t('sidebar.barangay.incidents'), icon: <ComplaintsIcon /> },
    { path: "/dashboard/announcements", label: t('sidebar.barangay.announcements'), icon: <AnnouncementsIcon /> },
  ];

  return (
    <GenericSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={NAV_ITEMS}
    />
  );
};
