import { Menu, Home, CheckCircle, Clock, Eye, Send  } from "lucide-react"

export const HamburgerIcon = () => <Menu className="w-5 h-5" />;
export const DashboardIcon = () => <Home className="w-5 h-5" />;
export const ResolvedIcon = () => <CheckCircle className="w-6 h-6" />;
export const PendingIcon = () => <Clock className="w-6 h-6" />;
export const ReviewIcon = () => <Eye className="w-6 h-6" />;
export const ForwardedIcon = () => <Send className="w-6 h-6" />;

export const TotalIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;

export const ComplaintsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);
