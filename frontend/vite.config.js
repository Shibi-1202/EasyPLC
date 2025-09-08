import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Add this proxy configuration
    proxy: {
      // Proxy requests starting with '/generate-code'
      '/generate-code': {
        target: 'http://127.0.0.1:8000', // Your backend server URL
        changeOrigin: true, // Needed for virtual hosted sites
      }
    }
  }
})
