import { useTranslation } from "react-i18next";
import { Sidebar as GenericSidebar } from "../../general";
import { DashboardIcon, ComplaintsIcon } from "../../barangay/components/Icons";

interface DepartmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  
  const NAV_ITEMS = [
    { path: "/department/dashboard", label: t('sidebar.department.dashboard'), icon: <DashboardIcon />, end: true },
    { path: "/department/incidents", label: t('sidebar.department.incidents'), icon: <ComplaintsIcon /> },
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
