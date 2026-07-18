import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
export const DRIZZLE = 'DRIZZLE'
import * as schema from 'src/schema'

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({ connectionString: config.get<string>('DATABASE_URL') })
        return drizzle(pool, { schema })
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
