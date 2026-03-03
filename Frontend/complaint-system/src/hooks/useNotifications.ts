import { useEffect, useCallback } from 'react';
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

  const handleNotification = useCallback<NotificationHandler>(
    (notification) => {
      if (onNotification) {
        onNotification(notification);
      }
    },
    [onNotification]
  );

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    events.forEach(event => {
      notificationService.on(event, handleNotification);
    });

    if (autoConnect) {
      notificationService.connect();
    }

    return () => {
      events.forEach(event => {
        notificationService.off(event, handleNotification);
      });
      
      if (notificationService['handlers'].size === 0) {
        notificationService.disconnect();
      }
    };
  }, [isAuthenticated, accessToken, events, handleNotification, autoConnect]);

  return {
    connect: () => notificationService.connect(),
    disconnect: () => notificationService.disconnect(),
    isConnected: () => notificationService.isConnected(),
  };
};
