import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // `?raw` CSS imports are empty under vitest unless CSS is processed.
      css: { include: /index\.css/ },
    },
  }),
)
