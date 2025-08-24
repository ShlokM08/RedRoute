// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: '/',  // (default, but fine to be explicit)
})
