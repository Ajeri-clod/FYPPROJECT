import tailwindcss from "@tailwindcss/vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
    // Let a temporary share link (share-dashboard.bat: Cloudflare quick
    // tunnel) reach the dev server, e.g. https://xyz.trycloudflare.com.
    allowedHosts: [".trycloudflare.com"],
  },
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    nitroV2Plugin({ preset: "node-server" }),
    viteReact(),
    devtoolsJson(),
  ],
});
