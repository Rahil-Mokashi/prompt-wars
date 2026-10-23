import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Browser entry points that need a real DOM/Firebase/canvas are covered by the Playwright test.
      exclude: [
        'src/main.ts',
        'src/firebase.ts',
        'src/ai/mock.ts',
        'src/utils/image.ts',
        'src/**/*.d.ts',
      ],
      thresholds: { lines: 80 },
    },
  },
});
