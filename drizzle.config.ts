import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema.ts', // Path to schema file
  out: 'drizzle', // Path to output directory
  dialect: 'postgresql', // Database dialect
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
}
