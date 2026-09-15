import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/Yany/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': __dirname,
      },
    },
  };
});
