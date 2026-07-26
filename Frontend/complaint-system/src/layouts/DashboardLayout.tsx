import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HamburgerIcon } from "../features/barangay/components/Icons";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "../hooks/useToast";
import { ToastContainer } from "../components/Toast";
import { EmergencyAlert } from "../components/EmergencyAlert";
import { queryClient } from "../main";

interface DashboardLayoutProps {
  SidebarComponent: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

type EmergencyAlertItem = {
  id: number | string;
  title: string;
  incidentId?: number;
  severityLevel: string;
  receivedAt: string | Date;
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ SidebarComponent }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emergencyQueue, setEmergencyQueue] = useState<EmergencyAlertItem[]>([]);
  const { t } = useTranslation();
  const { toasts, showToast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousEmergencyCount = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Emergency sound file (keeps original filename with space)
  const emergencySoundUrl = new URL('../assets/Emergency sound.mp3', import.meta.url).href;

  useEffect(() => {
    audioRef.current = new Audio(emergencySoundUrl);
    audioRef.current.preload = 'auto';

    // audio element initialized for real emergency notifications

    return () => {
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch (e) {}
        audioRef.current = null;
      }
      // cleanup complete
    };
  }, []);

  const getRoutePrefix = () => {
    if (location.pathname.startsWith('/lgu')) return '/lgu';
    if (location.pathname.startsWith('/superadmin')) return '/superadmin';
    return '/dashboard';
  };

  const getIncidentPath = () => {
    const prefix = getRoutePrefix();

    if (prefix === '/superadmin') {
      return null;
    }

    return `${prefix}/incidents?severity=HIGH&sort=date_oldest_first`;
  };

  const emergencyItems = useMemo(
    () => [...emergencyQueue]
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .map((item) => ({
        id: item.id,
        title: item.title,
        severityLevel: item.severityLevel,
        reportedAt: item.receivedAt,
      })),
    [emergencyQueue]
  );

  const emergencyCount = emergencyItems.length;

  const pauseEmergencySound = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.loop = false;
      } catch (e) {
        console.error('Failed to stop emergency sound:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (emergencyCount > 0 && previousEmergencyCount.current === 0) {
      try {
        if (audioRef.current) {
          audioRef.current.loop = true;
          audioRef.current.currentTime = 0;
        }

        audioRef.current?.play().catch((e: any) => {
          console.warn('Emergency sound play prevented:', e);
        });
      } catch (e) {
        console.error('Failed to play emergency sound:', e);
      }
    }

    if (emergencyCount === 0 && previousEmergencyCount.current > 0) {
      pauseEmergencySound();
    }

    previousEmergencyCount.current = emergencyCount;
  }, [emergencyCount, pauseEmergencySound]);

  const stopEmergencyAlert = useCallback(() => {
    setEmergencyQueue([]);
    pauseEmergencySound();
  }, [pauseEmergencySound]);

  const viewEmergencyAlert = useCallback(() => {
    setEmergencyQueue([]);
    navigate(getIncidentPath() ?? `${getRoutePrefix()}/notifications`);
  }, [navigate]);

  const handleNotification = useCallback((notification: any) => {
    console.log('Received notification:', notification);
    
    // Invalidate notifications query to update the count and list
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    
    // Show toast based on notification type
    switch (notification.event) {
      case 'emergency':
        console.log('Emergency notification received:', notification.data);
        // Treat as emergency when event is 'emergency' and either data.type
        // or data.notification_type equals 'emergency'
        if (notification.data && (notification.data.type === 'emergency' || notification.data.notification_type === 'emergency')) {
          setEmergencyQueue((queue) => [...queue, {
            id: notification.data.incident_id ?? notification.data.id ?? `${Date.now()}-${queue.length}`,
            title: notification.data.title || 'Emergency',
            incidentId: notification.data.incident_id,
            severityLevel: notification.data.severity_level || 'HIGH',
            receivedAt: notification.data.sent_at || notification.data.created_at || new Date().toISOString(),
          }]);
        }
        break;
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
      {emergencyItems.length > 0 ? (
        <EmergencyAlert
          items={emergencyItems}
          onViewAll={viewEmergencyAlert}
          onDismissAll={stopEmergencyAlert}
        />
      ) : null}
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
