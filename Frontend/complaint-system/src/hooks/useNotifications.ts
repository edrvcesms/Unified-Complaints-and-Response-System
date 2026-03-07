import { useEffect, useCallback, useRef, useMemo } from 'react';
import { notificationService, type NotificationHandler } from '../services/notifications/notificationService';
import { useAuthStore } from '../store/authStore';

interface UseNotificationsOptions {
  /**
   * List of event types to listen for (e.g., ['new_complaint', 'order_update'])
   * Use '*' to listen to all events
   */
  events?: string[];
  
  /**
   * Handler function called when a notification is received
   */
  onNotification?: NotificationHandler;
  
  /**
   * Auto-connect on mount (default: true)
   */
  autoConnect?: boolean;
}

/**
 * Hook to manage SSE notifications for barangay, LGU, and department users
 * 
 * @example
 * // Listen to specific events
 * useNotifications({
 *   events: ['new_complaint', 'complaint_update'],
 *   onNotification: (notification) => {
 *     console.log('Received:', notification);
 *     // Handle the notification (show toast, update UI, etc.)
 *   }
 * });
 * 
 * @example
 * // Listen to all events
 * useNotifications({
 *   events: ['*'],
 *   onNotification: (notification) => {
 *     if (notification.event === 'new_complaint') {
 *       // Handle new complaint
 *     }
 *   }
 * });
 */
export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { events = ['*'], onNotification, autoConnect = true } = options;
  const { isAuthenticated, accessToken } = useAuthStore();
  
  // Use ref to store the latest handler without causing re-renders
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  // Memoize events array to prevent unnecessary re-renders
  const memoizedEvents = useMemo(() => events, [JSON.stringify(events)]);

  const handleNotification = useCallback<NotificationHandler>(
    (notification) => {
      if (handlerRef.current) {
        handlerRef.current(notification);
      }
    },
    [] // No dependencies - uses ref
  );

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    // Register handlers
    memoizedEvents.forEach(event => {
      notificationService.on(event, handleNotification);
    });

    // Connect only once
    if (autoConnect) {
      notificationService.connect();
    }

    return () => {
      // Cleanup handlers
      memoizedEvents.forEach(event => {
        notificationService.off(event, handleNotification);
      });
      
      // Only disconnect if no handlers remain
      if (notificationService['handlers'].size === 0) {
        notificationService.disconnect();
      }
    };
  }, [isAuthenticated, accessToken, memoizedEvents, handleNotification, autoConnect]);

  return {
    connect: () => notificationService.connect(),
    disconnect: () => notificationService.disconnect(),
    isConnected: () => notificationService.isConnected(),
  };
};
