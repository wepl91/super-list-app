import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Super List",
    short_name: "SuperList",
    description: "App de listas instalable, con soporte offline y notificaciones push.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4fbf7",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
