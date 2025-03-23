import { defineConfig } from 'vitest/config';
import { workersPool } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  test: {
    pool: workersPool(),
    poolOptions: {
      workers: {
        isolate: false,
      },
    },
  },
});