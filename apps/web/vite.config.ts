import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Binds 0.0.0.0, not just localhost — reachable from other devices on the same LAN
    // (Nicole's laptop/phone on the same Wi-Fi), not just this Mac.
    host: true,
  },
});
