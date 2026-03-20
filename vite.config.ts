import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/SuttaLog2/',
  server: {
    port: 3023,
    host: true,
  },
  preview: {
    port: 3023,
  },
})
