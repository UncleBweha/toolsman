import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-slider",
            "@radix-ui/react-accordion",
            "@radix-ui/react-checkbox",
          ],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-motion": ["framer-motion"],
        },
      },
    },
  },
});
