import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HamburgerIcon } from "../features/barangay/components/Icons";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "../hooks/useToast";
import { ToastContainer } from "../components/Toast";
import { EmergencyAlert } from "../components/EmergencyAlert";
import { emergencyQueueApi } from "../services/axios/apiServices";
import { queryClient } from "../main";

const MAX_EMERGENCY_QUEUE_SIZE = 10;

interface DashboardLayoutProps {
  SidebarComponent: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
  }>;
}

type EmergencyAlertItem = {
  id: number | string;
  title: string;
  incidentId?: number;
  severityLevel: string;
  receivedAt: string | Date;
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  SidebarComponent,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emergencyQueue, setEmergencyQueue] = useState<
    EmergencyAlertItem[]
  >([]);

  const { t } = useTranslation();
  const { toasts, showToast } = useToast();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousEmergencyCount = useRef(0);

  const location = useLocation();
  const navigate = useNavigate();

  // Emergency sound file
  const emergencySoundUrl = new URL(
    "../assets/Emergency sound.mp3",
    import.meta.url
  ).href;

  /**
   * Initialize emergency audio.
   */
  useEffect(() => {
    const audio = new Audio(emergencySoundUrl);

    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
      } catch (error) {
        console.warn(
          "Failed to clean up emergency audio:",
          error
        );
      }

      audioRef.current = null;
    };
  }, [emergencySoundUrl]);

  /**
   * Hydrate existing emergency queue from backend.
   *
   * Uses the existing Axios API service instead of fetch().
   */
  useEffect(() => {
  const hydrateEmergencyQueue = async () => {
    try {
      const response = await emergencyQueueApi.get<{
        emergencies?: any[];
      }>("/");

      console.log("Emergency queue response:", response);

      const emergencies = Array.isArray(response?.emergencies)
        ? response.emergencies
        : [];

      const formattedEmergencies: EmergencyAlertItem[] = emergencies
        .map((item: any, index: number) => ({
          id:
            item.incidentId ??
            item.incident_id ??
            item.id ??
            `hydrated-${Date.now()}-${index}`,

          title: item.title || "Emergency",

          incidentId:
            item.incidentId ??
            item.incident_id,

          severityLevel:
            item.severityLevel ??
            item.severity_level ??
            "HIGH",

          receivedAt:
            item.receivedAt ??
            item.received_at ??
            item.createdAt ??
            item.created_at ??
            new Date().toISOString(),
        }))
        .slice(-MAX_EMERGENCY_QUEUE_SIZE);

      setEmergencyQueue((currentQueue) => {
        const combined = [...currentQueue];

        for (const emergency of formattedEmergencies) {
          const alreadyExists = combined.some((item) => {
            if (
              emergency.incidentId != null &&
              item.incidentId != null
            ) {
              return item.incidentId === emergency.incidentId;
            }

            return item.id === emergency.id;
          });

          if (!alreadyExists) {
            combined.push(emergency);
          }
        }

        return combined.slice(-MAX_EMERGENCY_QUEUE_SIZE);
      });
    } catch (error) {
      console.error(
        "Failed to hydrate emergency queue:",
        error
      );
    }
  };

  hydrateEmergencyQueue();
}, []);

  /**
   * Determine current dashboard route prefix.
   */
  const getRoutePrefix = useCallback(() => {
    if (location.pathname.startsWith("/lgu")) {
      return "/lgu";
    }

    if (
      location.pathname.startsWith("/superadmin")
    ) {
      return "/superadmin";
    }

    return "/dashboard";
  }, [location.pathname]);

  /**
   * Convert emergency queue into the format
   * expected by EmergencyAlert.
   */
  const emergencyItems = useMemo(() => {
    return [...emergencyQueue]
      .sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() -
          new Date(a.receivedAt).getTime()
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        incidentId: item.incidentId,
        severityLevel: item.severityLevel,
        reportedAt: item.receivedAt,
      }));
  }, [emergencyQueue]);

  const emergencyCount = emergencyItems.length;

  /**
   * Stop emergency sound.
   */
  const pauseEmergencySound = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    } catch (error) {
      console.error(
        "Failed to stop emergency sound:",
        error
      );
    }
  }, []);

  /**
   * Play emergency sound when the first
   * emergency enters the queue.
   *
   * Stop it when the queue becomes empty.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (
      emergencyCount > 0 &&
      previousEmergencyCount.current === 0
    ) {
      if (audio) {
        try {
          audio.loop = true;
          audio.currentTime = 0;

          audio.play().catch((error) => {
            console.warn(
              "Emergency sound play prevented:",
              error
            );
          });
        } catch (error) {
          console.error(
            "Failed to play emergency sound:",
            error
          );
        }
      }
    }

    if (
      emergencyCount === 0 &&
      previousEmergencyCount.current > 0
    ) {
      pauseEmergencySound();
    }

    previousEmergencyCount.current =
      emergencyCount;
  }, [
    emergencyCount,
    pauseEmergencySound,
  ]);

  /**
   * Dismiss all emergency alerts.
   */
  const stopEmergencyAlert = useCallback(() => {
    setEmergencyQueue([]);
    pauseEmergencySound();
  }, [pauseEmergencySound]);

  /**
   * View all emergency incidents.
   */
  const viewEmergencyAlert = useCallback(() => {
    const prefix = getRoutePrefix();

    const snapshot = emergencyItems.filter(
      (item) => item.incidentId != null
    );

    console.log(
      "Snapshot of emergency items to persist:",
      snapshot
    );

    try {
      sessionStorage.setItem(
        "emergencyQueueSnapshot",
        JSON.stringify({
          prefix,
          items: snapshot,
        })
      );
    } catch (error) {
      console.warn(
        "Failed to persist emergency snapshot:",
        error
      );
    }

    setEmergencyQueue([]);
    pauseEmergencySound();

    navigate(
      `${prefix}/emergency-incidents`,
      {
        state: {
          prefix,
          emergencyItems: snapshot,
        },
      }
    );
  }, [
    getRoutePrefix,
    navigate,
    emergencyItems,
    pauseEmergencySound,
  ]);

  /**
   * Handle real-time notifications.
   */
  const handleNotification = useCallback(
    (notification: any) => {
      console.log(
        "Received notification:",
        notification
      );

      const data = notification?.data || {};

      // Refresh notifications.
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });

      switch (notification?.event) {
        /**
         * Emergency removed.
         */
        case "emergency_removed": {
          const removedIncidentId =
            data.incident_id ??
            data.incidentId;

          setEmergencyQueue((queue) =>
            queue.filter(
              (item) =>
                item.incidentId !==
                removedIncidentId
            )
          );

          break;
        }

        /**
         * New emergency.
         *
         * IMPORTANT:
         * Since we are already inside
         * case "emergency", we do not need
         * data.type === "emergency".
         */
        case "emergency": {
          console.log(
            "Emergency notification received:",
            data
          );

          showToast({
            type: "error",
            title: "Emergency Alert",
            message:
              data.message ||
              "A new emergency complaint has been submitted",
            duration: 5000,
          });

          const incidentId =
            data.incident_id ??
            data.incidentId;

          const emergencyId =
            incidentId ??
            data.id ??
            `emergency-${Date.now()}`;

          setEmergencyQueue((queue) => {
            /**
             * Prevent duplicate emergencies.
             */
            const alreadyExists = queue.some(
              (item) => {
                if (
                  incidentId != null &&
                  item.incidentId != null
                ) {
                  return (
                    item.incidentId ===
                    incidentId
                  );
                }

                return (
                  item.id === emergencyId
                );
              }
            );

            if (alreadyExists) {
              return queue;
            }

            const newEmergency: EmergencyAlertItem =
              {
                id: emergencyId,

                title:
                  data.title ||
                  "Emergency",

                incidentId,

                severityLevel:
                  data.severity_level ??
                  data.severityLevel ??
                  "HIGH",

                receivedAt:
                  data.sent_at ??
                  data.sentAt ??
                  data.created_at ??
                  data.createdAt ??
                  new Date().toISOString(),
              };

            /**
             * Add emergency and keep only
             * the latest 10.
             */
            return [
              ...queue,
              newEmergency,
            ].slice(
              -MAX_EMERGENCY_QUEUE_SIZE
            );
          });

          break;
        }

        /**
         * New complaint.
         */
        case "new_complaint": {
          console.log(
            "New complaint received:",
            data
          );

          queryClient.invalidateQueries({
            queryKey: ["incidents"],
          });

          showToast({
            type: "info",
            title: "New Complaint",
            message:
              data.message ||
              "A new complaint has been submitted",
            duration: 5000,
          });

          break;
        }

        /**
         * Complaint updated.
         */
        case "complaint_update": {
          console.log(
            "Complaint updated:",
            data
          );

          queryClient.invalidateQueries({
            queryKey: ["incidents"],
          });

          showToast({
            type: "info",
            title: "Complaint Updated",
            message:
              data.message ||
              "A complaint has been updated",
            duration: 5000,
          });

          break;
        }

        /**
         * Complaint rejected.
         */
        case "complaint_reject": {
          console.log(
            "Complaint rejected:",
            data
          );

          queryClient.invalidateQueries({
            queryKey: ["incidents"],
          });

          showToast({
            type: "error",
            title: "Complaint Rejected",
            message:
              data.message ||
              "A complaint has been rejected",
            duration: 5000,
          });

          break;
        }

        /**
         * System alert.
         */
        case "system_alert": {
          console.log(
            "System alert:",
            data
          );

          showToast({
            type: "warning",
            title: "System Alert",
            message:
              data.message ||
              "System alert received",
            duration: 5000,
          });

          break;
        }

        /**
         * Other notifications.
         */
        default: {
          console.log(
            "Other notification:",
            notification
          );

          showToast({
            type: "info",
            title: "Notification",
            message:
              data.message ||
              "You have a new notification",
            duration: 5000,
          });

          break;
        }
      }
    },
    [showToast]
  );

  /**
   * Subscribe to notification stream.
   */
  useNotifications({
    events: ["*"],
    onNotification: handleNotification,
  });

  return (
    <>
      <ToastContainer toasts={toasts} />

      {emergencyItems.length > 0 && (
        <EmergencyAlert
          items={emergencyItems}
          onViewAll={viewEmergencyAlert}
          onDismissAll={stopEmergencyAlert}
        />
      )}

      <div
        className="flex overflow-hidden bg-gray-50"
        style={{
          height:
            "calc(100dvh - var(--navbar-h))",
        }}
      >
        <div className="flex flex-1 overflow-hidden">
          <SidebarComponent
            isOpen={sidebarOpen}
            onClose={() =>
              setSidebarOpen(false)
            }
          />

          <main className="flex-1 overflow-y-auto">
            <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
              <button
                onClick={() =>
                  setSidebarOpen(true)
                }
                aria-label={t(
                  "frontend.a11y.openSidebar"
                )}
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