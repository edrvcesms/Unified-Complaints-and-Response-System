self.addEventListener("push", (event) => {
    console.log("[Service Worker] Push received");

    let data = {
        title: "New Notification",
        body: "You have received a new notification.",
        icon: "/StaMariaLogo.jpg",
        url: "/notifications",
    };

    if (event.data) {
        try {
            data = event.data.json();

            console.log("[Service Worker] Received data:", data);
        } catch (error) {
            console.error(
                "[Service Worker] Failed to parse push data:",
                error
            );
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,

            // Use the icon sent by FastAPI
            icon: data.icon,

            // Optional
            badge: data.icon,

            // Store the received data so notificationclick can use it
            data: {
                url: data.url,
                notification_id: data.notification_id,
                type: data.type,
            },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data?.url || "/notifications";

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        }).then((clientList) => {
            for (const client of clientList) {
                if ("focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});