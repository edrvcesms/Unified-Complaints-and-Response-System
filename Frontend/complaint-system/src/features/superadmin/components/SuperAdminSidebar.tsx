import { Sidebar as GenericSidebar } from "../../general";
import { Users, Tags, ShieldCheck, PhoneCall, UserCog } from "lucide-react";

interface SuperAdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { path: "/superadmin/accounts", label: "Manage Official Accounts", icon: <Users className="w-5 h-5" />, group: "Account Management" },
    { path: "/superadmin/resident-account-management", label: "Manage Resident Restrictions", icon: <UserCog className="w-5 h-5" />, group: "Account Management" },
    { path: "/superadmin/verify-users", label: "Verify Resident Accounts", icon: <ShieldCheck className="w-5 h-5" />, group: "Account Management" },
    { path: "/superadmin/categories", label: "Categories", icon: <Tags className="w-5 h-5" />, group: "System Configuration" },
    { path: "/superadmin/emergency-hotlines", label: "Emergency Hotlines", icon: <PhoneCall className="w-5 h-5" />, group: "System Configuration" },
    { path: "/superadmin/knowledge-base", label: "Knowledge Base", icon: <ShieldCheck className="w-5 h-5" />, group: "System Configuration" },
  ];

  return (
    <GenericSidebar
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      navigationLabel="Super Admin Dashboard"
      footerText="Admin Console"
    />
  );
};
