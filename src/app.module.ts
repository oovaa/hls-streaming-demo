import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { BullModule } from '@nestjs/bullmq';
import { VideoController } from './video/video.controller';
import { WorkerService } from './worker/worker.service';
import { VideoQueueEventListiener } from 'vidoe_queue_event';

export const TRANSCODE_QUEUE_NAME = 'transcode';

@Module({
  imports: [
    UploadModule,
    BullModule.forRoot({
      connection: { host: 'localhost', port: 6379 },
      defaultJobOptions: { attempts: 3, backoff: 2000, removeOnComplete: 1000 },
    }),
    BullModule.registerQueue({ name: 'hls' }),
  ],
  controllers: [AppController, VideoController],
  providers: [
    VideoQueueEventListiener,
    WorkerService,
    AppService,
    WorkerService,
  ],
})
export class AppModule {}
