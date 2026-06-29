import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

@QueueEventsListener('hls')
export class VideoQueueEventListiener extends QueueEventsHost {
  logger = new Logger('Queue');

  @OnQueueEvent('added')
  onAdd(job: { jobId: string; name: string }) {
    this.logger.log(`${job}, ${job.jobId}, Has been added to the queue`);
  }
  @OnQueueEvent('completed')
  onComplete(job: { jobId: string; name: string }) {
    this.logger.log(`${job}, ${job.jobId}, Has Been Completed ~~~!!!!`);
  }
}
