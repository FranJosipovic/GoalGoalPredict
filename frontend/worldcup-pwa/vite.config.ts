import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        importScripts: ["push-sw.js"],
      },
      manifest: {
        id: "/",
        name: "GoalGoalPredict",
        short_name: "GGPredict",
        description: "Football prediction competitions with friends",
        theme_color: "#060c09",
        background_color: "#060c09",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          {
            src: "/screenshot-mobile.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "GoalGoalPredict - Your Groups",
          },
          {
            src: "/screenshot-desktop.png",
            sizes: "1280x800",
            type: "image/png",
            form_factor: "wide",
            label: "GoalGoalPredict - Dashboard",
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: true,
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  },
});
