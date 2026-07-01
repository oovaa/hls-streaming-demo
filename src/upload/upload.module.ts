import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { BullModule } from '@nestjs/bullmq';
import { TRANSCODE_QUEUE_NAME } from 'src/transcode/transcode.constants';

@Module({
  imports: [BullModule.registerQueue({ name: TRANSCODE_QUEUE_NAME })],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
