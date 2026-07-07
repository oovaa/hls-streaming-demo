import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { BullModule } from '@nestjs/bullmq';
import { TRANSCODE_QUEUE_NAME } from '../transcode/transcode.constants';

@Module({
  imports: [BullModule.registerQueue({ name: TRANSCODE_QUEUE_NAME })],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}
