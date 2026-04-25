import { useTranslation } from "react-i18next";
import { Archive, MessageSquare } from "lucide-react";
import { Sidebar as GenericSidebar } from "../../general";
import { DashboardIcon, ComplaintsIcon, AnnouncementsIcon, EventsIcon } from "./Icons";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  
  const NAV_ITEMS = [
    { path: "/dashboard", label: t('sidebar.barangay.dashboard'), icon: <DashboardIcon />, end: true },
    { path: "/dashboard/incidents", label: t('sidebar.barangay.incidents'), icon: <ComplaintsIcon /> },
    { path: "/dashboard/archive", label: "Archive", icon: <Archive className="w-5 h-5" /> },
    { path: "/dashboard/feedbacks", label: "Feedbacks", icon: <MessageSquare className="w-5 h-5" /> },
    { path: "/dashboard/announcements", label: t('sidebar.barangay.announcements'), icon: <AnnouncementsIcon /> },
    { path: "/dashboard/events", label: t('sidebar.barangay.events'), icon: <EventsIcon /> },
  ];

  return (
    <GenericSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={NAV_ITEMS}
    />
  );
};
