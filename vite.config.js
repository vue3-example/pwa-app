import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/pwa-app/", // "/저장소이름/"
  // npm run dev, npm run preview 에서 /api 요청을 Express 서버로 넘김
  server: { proxy: { "/api": "http://localhost:3001" } },
  preview: { proxy: { "/api": "http://localhost:3001" } },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // 새 버전이 배포되면 서비스 워커를 자동 갱신
      // /api 는 화면 이동으로 보고 index.html 로 바꿔치기하지 않음
      workbox: { navigateFallbackDenylist: [/^\/api/] },
      includeAssets: ["favicon.svg"], // 미리 캐시해 둘 public 폴더의 파일
      manifest: {
        name: "PWA 연습 앱", // 설치 안내창과 시작 화면에 쓰이는 전체 이름
        short_name: "PWA앱", // 홈 화면 아이콘 아래에 쓰이는 짧은 이름
        description: "Vite + React 로 만든 PWA 연습 프로젝트",
        display: "standalone", // 주소창 없는 독립 앱 화면으로 실행
        theme_color: "#646cff", // 상단 상태 표시줄 색
        background_color: "#ffffff", // 시작 화면 배경색
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
