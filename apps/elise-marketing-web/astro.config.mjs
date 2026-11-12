import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://eliselab.com",
  integrations: [react()],
  server: { port: 3200 },
});
