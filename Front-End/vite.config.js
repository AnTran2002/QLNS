import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Đọc Front-End/.env (xem .env.example). BACKEND_URL là nơi chạy Back-End PHP.
  const env = loadEnv(mode, process.cwd(), "");
  // Luôn dùng 127.0.0.1 thay cho "localhost": Node 17+ trên macOS hay phân giải localhost → ::1 (IPv6),
  // còn `php -S` / XAMPP trên Windows chỉ nghe 127.0.0.1 (IPv4) → proxy báo HTTP 502. Đổi luôn cả .env cũ.
  const backendUrl = (env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/\/localhost(?=[:/]|$)/i, "//127.0.0.1");

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
    server: {
      // Trình duyệt gọi /api/?action=... → Vite chuyển tiếp sang Back-End PHP.
      // Cùng origin nên cookie phiên PHPSESSID hoạt động, không vướng CORS.
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, "") || "/",
        },
      },
    },
    // Kiểm thử (Vitest): file *.test.js(x) nằm cạnh mã nguồn trong src/.
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.js"],
      css: false,
    },
    build: {
      rolldownOptions: {
        output: {
          // Tách thư viện ít thay đổi thành chunk riêng → trình duyệt cache lâu dài giữa các lần deploy.
          codeSplitting: {
            groups: [
              { name: "react", test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
              { name: "motion", test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/ },
              { name: "radix", test: /node_modules[\\/](radix-ui|@radix-ui|@floating-ui)[\\/]/ },
              { name: "data", test: /node_modules[\\/](@tanstack|axios)[\\/]/ },
            ],
          },
        },
      },
    },
  };
});
