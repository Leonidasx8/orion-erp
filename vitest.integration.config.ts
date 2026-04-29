import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    // Tests de integración corren secuencialmente para evitar conflictos de DB
    maxWorkers: 1,
    // Necesita Supabase local corriendo (pnpm db:start)
    setupFiles: ['tests/integration/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
