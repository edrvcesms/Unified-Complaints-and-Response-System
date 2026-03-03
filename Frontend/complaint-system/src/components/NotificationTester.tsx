import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { notificationService } from '../services/notifications/notificationService';

/**
 * Test component to verify SSE notifications are working
 * Add this to any dashboard page to test the notification system
 * 
 * Usage:
 * import { NotificationTester } from '../components/NotificationTester';
 * 
 * // In your component JSX:
 * <NotificationTester />
 */
export const NotificationTester = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to all notifications
  useNotifications({
    events: ['*'],
    onNotification: (notification) => {
      console.log('📬 Notification received:', notification);
      setNotifications(prev => [{
        ...notification,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 10)); // Keep last 10 notifications
    }
  });

  // Check connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(notificationService.isConnected());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto my-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          SSE Notification Tester
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={clearNotifications}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No notifications received yet.</p>
            <p className="text-sm mt-2">
              Submit a complaint to test the notification system.
            </p>
          </div>
        ) : (
          notifications.map((notif, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                  {notif.event}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-sm text-gray-700 overflow-x-auto bg-gray-100 p-3 rounded mt-2">
                {JSON.stringify(notif.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> Open the browser console to see detailed logs.
          Submit a complaint from another account or browser to test real-time notifications.
        </p>
      </div>
    </div>
  );
};
