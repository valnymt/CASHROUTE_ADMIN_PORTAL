import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // URL path the built app is served from. `npm run dev` always uses "/".
    // For XAMPP set VITE_BASE_PATH=/CashRoute/CashRoute_Admin_Portal/dist/ in .env.
    base: mode === 'production' ? (env.VITE_BASE_PATH ?? '/') : '/',
    server: { port: 5173 },
  }
})
