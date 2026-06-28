import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Post } from '@nestjs/common';
import { Queue } from 'bullmq';

@Controller()
export class VideoController {
  constructor(@InjectQueue('hls') private readonly videoQueue: Queue) {}

  @Post('process')
  async processVid() {
    const { data, name, id, queueQualifiedName, queueName } =
      await this.videoQueue.add(
        'hi',
        {
          filename: 'omar',
          type: 'mp4',
        },
        {
          attempts: 3,
        },
      );

    console.log('queued');

    return {
      message: 'processing video',
      data,
      name,
      id,
      queueName,
      queueQualifiedName,
    };
  }
}
