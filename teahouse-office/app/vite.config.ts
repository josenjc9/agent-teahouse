import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 兩個入口：index.html＝Office（3D＋看板＋儀表板分頁）；dashboard.html＝只有儀表板（不載入 Three.js，可獨立使用）
export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: { main: 'index.html', dashboard: 'dashboard.html' } } },
})
