import { useEffect, useState } from "react";
import { toast } from "sonner";
import { notificationsApi } from "../../lib/api";

export function PushOptIn() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      Notification.permission === "denied"
    ) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const existing = await reg?.pushManager?.getSubscription();
        if (existing) return;
        const config = await notificationsApi.vapidKey();
        if (active && config.enabled && config.publicKey) {
          setVisible(true);
        }
      } catch {
        // Ignore unavailable push configuration
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  if (!visible) return null;
  async function enable() {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setVisible(false);
        return;
      }
      if (Notification.permission === "denied") {
        setVisible(false);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }
      const config = await notificationsApi.vapidKey();
      if (!config.publicKey) {
        setVisible(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }));
      await notificationsApi.subscribe(subscription.toJSON());
      setVisible(false);
      toast.success("Issue update notifications enabled.");
    } catch (err: any) {
      toast.error(err?.message || "Unable to enable push notifications.");
    }
  }
  return (
    <button
      onClick={() => void enable()}
      className="border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[9px] font-black uppercase tracking-wider"
    >
      Enable issue updates
    </button>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}
