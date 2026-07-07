import { Injectable, Logger } from '@nestjs/common';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { TRANSCODE_QUEUE_NAME } from 'src/transcode/transcode.constants';
import { Queue } from 'bullmq';

@Injectable()
export class StreamService {
  constructor(
    @InjectQueue(TRANSCODE_QUEUE_NAME) private readonly videoQueue: Queue,
  ) {}
  create(createStreamDto: CreateStreamDto) {
    return 'This action adds a new stream';
  }
  async getJobStatus(id: string) {
    try {
      const job_details = await this.videoQueue.getJob(id);
      Logger.log(`Gog the job details of the id: ${job_details?.id}`);
      return job_details;
    } catch (err) {
      Logger.warn('couldnt get the job id not found');
      return null;
    }
  }
}
