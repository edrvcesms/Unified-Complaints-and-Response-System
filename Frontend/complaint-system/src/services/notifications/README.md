# Real-time Notifications with SSE

This folder contains the notification service for handling Server-Sent Events (SSE) for real-time notifications.

## Overview

The notification system automatically connects barangay, LGU, and department users to receive real-time notifications such as:
- New complaints submitted
- Complaint status updates
- System alerts and announcements
- And more...

## Architecture

### Backend
- **Endpoint**: `GET /api/v1/notifications/stream`
- **Protocol**: Server-Sent Events (SSE)
- **Authentication**: Bearer token required
- **Manager**: Redis-based pub/sub for scalability

### Frontend
- **Service**: `notificationService.ts` - Manages SSE connections
- **Hook**: `useNotifications.ts` - React hook for easy integration
- **Auto-connect**: Enabled in `DashboardLayout.tsx` for all dashboards

## Usage

### Automatic (Recommended)
All dashboard users automatically subscribe to notifications when logged in. The connection is managed in `DashboardLayout.tsx`.

### Manual Usage

```typescript
import { useNotifications } from '../hooks/useNotifications';

function MyComponent() {
  useNotifications({
    events: ['new_complaint', 'complaint_update'],
    onNotification: (notification) => {
      console.log('Event:', notification.event);
      console.log('Data:', notification.data);
      
      // Show toast, update UI, etc.
      if (notification.event === 'new_complaint') {
        toast.info(`New complaint: ${notification.data.title}`);
      }
    }
  });
  
  return <div>My Component</div>;
}
```

### Listen to All Events

```typescript
useNotifications({
  events: ['*'], // Wildcard to listen to all events
  onNotification: (notification) => {
    // Handle any notification
  }
});
```

### Direct Service Usage

```typescript
import { notificationService } from '../services/notifications/notificationService';

// Connect
notificationService.connect();

// Subscribe to events
notificationService.on('new_complaint', (notification) => {
  console.log('New complaint:', notification.data);
});

// Unsubscribe
notificationService.off('new_complaint', handler);

// Disconnect
notificationService.disconnect();
```

## Notification Events

### new_complaint
Sent when a new complaint is submitted to a barangay.

```typescript
{
  event: 'new_complaint',
  data: {
    complaint_id: 287,
    title: 'Noise Disturbance',
    description: '...',
    location_details: '...',
    barangay_id: 1,
    category_id: 5,
    status: 'submitted',
    created_at: '2026-03-03T10:29:01'
  }
}
```

### complaint_update
Sent when a complaint status or details are updated.

```typescript
{
  event: 'complaint_update',
  data: {
    complaint_id: 287,
    status: 'in_progress',
    updated_at: '2026-03-03T11:00:00'
  }
}
```

### system_alert
Broadcast to all users for system-wide alerts.

```typescript
{
  event: 'system_alert',
  data: {
    title: 'Scheduled Maintenance',
    message: 'System will be down at 2AM UTC',
    duration_minutes: 30
  }
}
```

### announcement
Broadcast for important announcements.

```typescript
{
  event: 'announcement',
  data: {
    title: 'New Feature!',
    message: 'Dark mode is now available',
    url: '/settings/appearance'
  }
}
```

## Features

- ✅ Automatic reconnection with exponential backoff
- ✅ Authentication via Bearer token
- ✅ Multiple event type support
- ✅ Wildcard event listeners
- ✅ Auto-connect/disconnect on auth state change
- ✅ Memory leak prevention (auto cleanup)
- ✅ Error handling and logging

## Backend Integration

To send notifications from the backend:

```python
from app.services.sse_manager import sse_manager

# Send to specific user
await sse_manager.send(
    user_id=123,
    event="new_complaint",
    data={
        "complaint_id": 287,
        "title": "Noise Disturbance",
        # ... more data
    }
)

# Broadcast to all users
await sse_manager.broadcast(
    event="system_alert",
    data={
        "title": "Maintenance",
        "message": "System going down"
    }
)
```

## Troubleshooting

### Not receiving notifications?
1. Check if access token is present in the auth store
2. Open browser dev tools > Network tab > Look for `stream` connection
3. Check console for connection errors
4. Verify backend `/api/v1/notifications/stream` endpoint is accessible

### Notifications stop after a while?
- The service has auto-reconnect enabled
- Check console logs for reconnection attempts
- Max reconnect attempts: 5

### Multiple connections?
- The service prevents duplicate connections
- Only one connection per user session is maintained
