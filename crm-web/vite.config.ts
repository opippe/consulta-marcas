import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (command === "build") {
    for (const key of ["VITE_API_BASE_URL", "VITE_PUBLIC_PROPOSAL_URL"]) {
      const value = process.env[key] || env[key];
      if (!value || new URL(value).protocol !== "https:") {
        throw new Error(`${key} deve conter a URL HTTPS de produção.`);
      }
    }
  }
  return {
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    strictPort: true,
  },
  };
});
