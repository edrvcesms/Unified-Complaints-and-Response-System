import { useTranslation } from "react-i18next";
import { Sidebar as GenericSidebar } from "../../general";
import { DashboardIcon, ComplaintsIcon, AnnouncementsIcon } from "../../barangay/components/Icons";
import { MapPin, FileText, Archive } from "lucide-react";

interface LguSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LguSidebar: React.FC<LguSidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  
  const NAV_ITEMS = [
    { path: "/lgu/dashboard", label: t('sidebar.lgu.dashboard'), icon: <DashboardIcon />, end: true, group: "Dashboard" },
    { path: "/lgu/barangay-incidents", label: t('sidebar.lgu.barangayIncidents'), icon: <MapPin className="w-5 h-5" />, group: "Manage Incidents" },
    { path: "/lgu/incidents", label: t('sidebar.lgu.forwardedIncidents'), icon: <ComplaintsIcon />, group: "Manage Incidents" },
    { path: "/lgu/archive", label: "Archive", icon: <Archive className="w-5 h-5" />, group: "Manage Incidents" },
    { path: "/lgu/feedbacks", label: "Feedbacks", icon: <ComplaintsIcon />, group: "Manage Incidents" },
    { path: "/lgu/monthly-reports", label: t('sidebar.lgu.monthlyReports'), icon: <FileText className="w-5 h-5" />, group: "Reports" },
    { path: "/lgu/announcements", label: t('sidebar.lgu.announcements'), icon: <AnnouncementsIcon />, group: "Communication" },
  ];

  return (
    <GenericSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={NAV_ITEMS}
      navigationLabel={t('sidebar.lgu.navLabel')}
      footerText={t('sidebar.lgu.footer')}
    />
  );
};
