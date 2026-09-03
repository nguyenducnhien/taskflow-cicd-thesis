import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Port 3000 matches CORS_ORIGIN in backend/.env.example — keeps the
  // backend's CORS allow-list working without touching its .env.
  server: {
    port: 3000,
  },
})
