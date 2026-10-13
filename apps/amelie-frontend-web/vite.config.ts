import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    include: [
      "@tanstack/charts",
      "@tanstack/charts/react",
      "@tanstack/charts/motion",
      "@tanstack/charts/scales/linear",
      "@tanstack/charts/scales/point",
      "d3-shape",
    ],
  },
  plugins: [
    devtools(),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
