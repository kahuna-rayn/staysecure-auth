import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "StaySecureAuth",
      formats: ["es", "umd"],
      fileName: (format) => `index.${format === "es" ? "esm" : format}.js`
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react-router-dom",
        "@supabase/supabase-js",
        "lucide-react",
        /^@\/components\//,
        /^@\/assets\//,
        /^@\/integrations\//,
        /^@\/lib\//,
        /^@\/hooks\//
      ],
      output: {
        globals: {
          "react": "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "react/jsx-runtime",
          "@supabase/supabase-js": "Supabase"
        }
      }
    },
    sourcemap: true,
    minify: false
  }
});
