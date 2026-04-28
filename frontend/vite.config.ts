/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from 'tailwindcss'
import os from 'os'
import path from 'path'
import type { ServerResponse, IncomingMessage } from 'http'

const healthCheckPlugin = () => ({
  name: 'health-check',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/health', (_req: IncomingMessage, res: ServerResponse) => {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const ramUsage = (usedMem / totalMem) * 100;
      
      const cpus = os.cpus();
      const cpuUsage = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total);
      }, 0) / cpus.length * 100;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({
        status: 'Online',
        cpuUsage: Math.round(cpuUsage),
        ramUsage: Math.round(ramUsage),
        uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`
      }));
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), healthCheckPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        // autoprefixer(), // Temporarily disabled to check build
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
