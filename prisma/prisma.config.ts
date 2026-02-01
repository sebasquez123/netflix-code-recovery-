import { defineConfig } from 'prisma/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  datasource: {
    url: `file:${path.join(__dirname, 'data/app.db')}`,
  },
})
