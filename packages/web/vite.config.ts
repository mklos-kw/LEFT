import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const server = `http://localhost:${process.env.SERVER_PORT ?? 3000}`;

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    // The backend handles the API and the OAuth round trips.
    proxy: { '/api': server, '/auth': server },
  },
});
