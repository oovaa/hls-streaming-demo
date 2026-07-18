import { Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { BullModule } from '@nestjs/bullmq';
import { TranscodeModule } from './transcode/transcode.module';
import { StreamModule } from './stream/stream.module';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './drizzle/drizzle.module';

@Module({
  imports: [
    UploadModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: { host: 'localhost', port: 6379 },
      defaultJobOptions: { attempts: 3, backoff: 2000, removeOnComplete: 1000 },
    }),
    TranscodeModule,
    StreamModule,
    DrizzleModule,
  ],
})
export class AppModule {}
