import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/domain/**',
        'src/actions/**',
        'src/utils/validate.ts',
        'src/ai/schemas.ts',
        'src/ai/model-fallback.ts',
      ],
      thresholds: { lines: 80 },
    },
  },
});
