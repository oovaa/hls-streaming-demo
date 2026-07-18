import { timestamp, integer, serial, text, pgTable } from 'drizzle-orm/pg-core'

export const video = pgTable('videos', {
  id: serial().primaryKey(),
  file_name: text().notNull(),
  path: text().notNull(),
  job_id: integer().notNull(),
  created_at: timestamp().defaultNow(),
})
