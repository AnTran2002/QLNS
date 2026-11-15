import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Đọc Front-End/.env, .env.local ... (xem .env.example)
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.BACKEND_URL || "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
    server: {
      // Front-End gọi /api/?action=... → Vite chuyển tiếp sang backend PHP.
      // Cùng origin nên cookie phiên đăng nhập (PHPSESSID) hoạt động, không cần CORS.
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, "") || "/",
        },
      },
    },
  };
});
