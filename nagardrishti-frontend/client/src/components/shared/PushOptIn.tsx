import { useEffect, useState } from "react";
import { notificationsApi } from "../../lib/api";

export function PushOptIn() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window)
      void notificationsApi
        .vapidKey()
        .then(config => setVisible(Boolean(config.enabled && config.publicKey)))
        .catch(() => undefined);
  }, []);
  if (!visible) return null;
  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setVisible(false);
    const config = await notificationsApi.vapidKey();
    if (!config.publicKey) return setVisible(false);
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
    await notificationsApi.subscribe(subscription.toJSON());
    setVisible(false);
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
