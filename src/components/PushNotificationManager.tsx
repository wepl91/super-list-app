"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { savePushSubscription } from "@/app/supabase-actions";

/** Convierte una base64url (VAPID public key) a Uint8Array, como exige
 *  `PushManager.subscribe({ applicationServerKey })`. */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
}

/**
 * Registra la suscripción push del usuario actual en `push_subscriptions`.
 * Sólo actúa en navegadores que soportan Notifications + PushManager + SW
 * (p.ej. Chromium/Android; Firefox/iOS Safari parcial). Sin permiso no vuelve
 * a preguntar. No renderiza UI.
 */
export default function PushNotificationManager() {
  const { status } = useAuth();
  // Inicialización perezosa (client-only): evita setState dentro de un effect.
  const [supported] = useState(pushSupported);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    () => (pushSupported() ? Notification.permission : null)
  );

  const signedIn = status === "signedIn";

  useEffect(() => {
    if (!supported || !signedIn || permission !== "default") return;

    let cancelled = false;

    async function register() {
      try {
        const granted = await Notification.requestPermission();
        if (cancelled) return;
        setPermission(granted);
        if (granted !== "granted") return;

        const registration = await navigator.serviceWorker.ready;
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await savePushSubscription({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys as {
            p256dh: string;
            auth: string;
          },
        });
      } catch (err) {
        console.error("No se pudo registrar notificaciones push:", err);
      }
    }

    register();
    return () => {
      cancelled = true;
    };
  }, [supported, signedIn, permission]);

  useEffect(() => {
    if (!supported || !signedIn || permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;

    // Si la suscripción vence o el push servidor es re-suscrito, volver a
    // registrarla automáticamente.
    let cancelled = false;

    async function resubscribe() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
          ),
        });
        if (cancelled) return;
        await savePushSubscription({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys as {
            p256dh: string;
            auth: string;
          },
        });
      } catch (err) {
        console.error("No se pudo re-registrar notificaciones push:", err);
      }
    }

    navigator.serviceWorker.addEventListener(
      "pushsubscriptionchange",
      resubscribe
    );
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "pushsubscriptionchange",
        resubscribe
      );
    };
  }, [supported, signedIn, permission]);

  return null;
}