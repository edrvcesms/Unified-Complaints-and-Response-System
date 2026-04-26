import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HamburgerIcon } from "../features/barangay/components/Icons";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "../hooks/useToast";
import { ToastContainer } from "../components/Toast";
import { queryClient } from "../main";

interface DashboardLayoutProps {
  SidebarComponent: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ SidebarComponent }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();
  const { toasts, showToast } = useToast();

  const handleNotification = useCallback((notification: any) => {
    console.log('Received notification:', notification);
    
    // Invalidate notifications query to update the count and list
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    
    // Show toast based on notification type
    switch (notification.event) {
      case 'new_complaint':
        console.log('New complaint received:', notification.data);
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        showToast({
          type: 'info',
          title: 'New Complaint',
          message: notification.data.message || 'A new complaint has been submitted',
          duration: 5000,
        });
        break;
      case 'complaint_update':
        console.log('Complaint updated:', notification.data);
        showToast({
          type: 'info',
          title: 'Complaint Updated',
          message: notification.data.message || 'A complaint has been updated',
          duration: 5000,
        });
        break;
      case 'complaint_reject':
        console.log('Complaint rejected:', notification.data);
        showToast({
          type: 'error',
          title: 'Complaint Rejected',
          message: notification.data.message || 'A complaint has been rejected',
          duration: 5000,
        });
        break;
      case 'system_alert':
        console.log('System alert:', notification.data);
        showToast({
          type: 'warning',
          title: 'System Alert',
          message: notification.data.message || 'System alert received',
          duration: 5000,
        });
        break;
      default:
        console.log('Other notification:', notification);
        showToast({
          type: 'info',
          title: 'Notification',
          message: notification.data.message || 'You have a new notification',
          duration: 5000,
        });
    }
  }, [showToast]); 
  
  useNotifications({
    events: ['*'],
    onNotification: handleNotification
  });

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div
        className="flex overflow-hidden bg-gray-50"
        style={{ height: "calc(100dvh - var(--navbar-h))" }}
      >
        <div className="flex flex-1 overflow-hidden">
          <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 overflow-y-auto">
            <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label={t('frontend.a11y.openSidebar')}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <HamburgerIcon />
              </button>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};
