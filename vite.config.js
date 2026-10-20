import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/js/app.tsx'],
      refresh: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./resources/js', import.meta.url)) },
  },
  // Built files reference each other with relative URLs, so the app works from
  // any sub-folder (e.g. http://localhost/CashRoute_Admin_Portal/public under XAMPP).
  experimental: {
    renderBuiltUrl(_filename, { hostType }) {
      return hostType === 'html' ? undefined : { relative: true }
    },
  },
  server: {
    watch: {
      ignored: ['**/storage/framework/views/**'],
    },
  },
})
