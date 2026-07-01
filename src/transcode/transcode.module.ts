import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TranscodeProcessor } from './transcode.processor';
import { TRANSCODE_QUEUE_NAME } from './transcode.constants';

@Module({
  imports: [BullModule.registerQueue({ name: TRANSCODE_QUEUE_NAME })],
  providers: [TranscodeProcessor],
})
export class TranscodeModule {}
