import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('hls')
export class WorkerService extends WorkerHost {
  process(job: Job, token?: string): Promise<any> {
    console.log('started consuming the queue jobs');

    console.log('got a new job', job.id, job.data);
    return Promise.resolve();
  }
}
