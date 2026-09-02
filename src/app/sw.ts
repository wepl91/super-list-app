/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  const data = (event.data?.json() ?? {}) as {
    title?: string;
    body?: string;
    icon?: string;
    url?: string;
  };
  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || "/icon-192x192.png",
    badge: "/icon-192x192.png",
    data: {
      dateOfArrival: Date.now(),
      url: data.url,
    },
  };
  event.waitUntil(self.registration.showNotification(data.title ?? "Super List", options));
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  notification.close();
  const targetUrl =
    (notification.data as { url?: string } | undefined)?.url ?? "/";
  // Si ya hay una ventana abierta en esa ruta, enfocarla; si no, abrirla.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: readonly WindowClient[]) => {
        const existing = clientList.find(
          (client) =>
            "url" in client &&
            new URL(client.url).pathname === new URL(targetUrl, self.location.origin).pathname
        );
        if (existing && "focus" in existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});
