import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // A fixed fake API origin: MSW intercepts requests to it, and nothing can hit a real backend.
    env: { VITE_API_BASE_URL: 'http://api.test/api/v1' },
  },
})
