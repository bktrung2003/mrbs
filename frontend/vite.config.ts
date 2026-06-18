import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "pwa-icon.svg",
        "assets/images/favicon.png",
        "assets/images/fusion-logo-color.png",
        "assets/images/fusion-logo-white.png",
      ],
      manifest: {
        name: "Fusion Hotel Group MRBS",
        short_name: "MRBS",
        description: "Meeting Room Booking System — Fusion Hotel Group",
        theme_color: "#D97706",
        background_color: "#FAF7F2",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/schedule",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/assets/images/fusion-logo-color.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/assets/images/fusion-logo-color.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/branding\/?$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "mrbs-branding",
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /\/api\/v1\/(areas|rooms)\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "mrbs-reference-data",
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
