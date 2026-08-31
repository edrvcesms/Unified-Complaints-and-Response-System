import { pushSubscriptionApi } from "../axios/apiServices";

const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);

    return Uint8Array.from(
        [...rawData].map((char) => char.charCodeAt(0))
    ).buffer;
};


export async function subscribeToPushNotifications(): Promise<PushSubscription> {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker is not supported.");
    }

    if (!("PushManager" in window)) {
        throw new Error("Push notifications are not supported.");
    }

    if (!("Notification" in window)) {
        throw new Error("Notifications are not supported.");
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
    }

    const registration = await navigator.serviceWorker.register("/sw.js");

    console.log("[Push] Service Worker registered.");

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
            throw new Error("VAPID public key is missing.");
        }

        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
                vapidPublicKey
            ),
        });
    }

    console.log("[Push] Subscription created.");

    return subscription;
}

export async function savePushSubscription(
    subscription: PushSubscription
): Promise<void> {
    const data = subscription.toJSON();

    await pushSubscriptionApi.post("/subscribe", {
        endpoint: data.endpoint,
        keys: {
            p256dh: data.keys?.p256dh,
            auth: data.keys?.auth,
        },
    });

    console.log("[Push] Subscription saved to backend.");
}

export async function testPushNotification(): Promise<void> {
    await pushSubscriptionApi.post("/push/test");

    console.log("[Push] Test notification request sent.");
}