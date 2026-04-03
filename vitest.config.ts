import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
      'server-only': path.join(rootDir, 'test/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
  },
})
