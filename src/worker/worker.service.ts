import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('hls', { concurrency: 2 })
export class WorkerService extends WorkerHost {
  async process(job: Job, _?: string): Promise<any> {
    await job.updateProgress(10);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await job.updateProgress(40);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await job.updateProgress(70);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await job.updateProgress(90);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await job.updateProgress(100);
    return Promise.resolve();
  }


  @OnWorkerEvent("progress")
  onProgress(job: Job) {
    console.log("job", job.id, "completed", job.progress, "%");
  }

  @OnWorkerEvent('active')
  onadd(job: Job) {
    console.log('added', job.id);
  }
  @OnWorkerEvent('completed')
  ondone(job: Job) {
    console.log('completed', job.id);
  }

  @OnWorkerEvent('failed')
  ondfail(job: Job) {

    console.log('failed', job.id, "JOB FAILED attemtp number", job.attemptsMade)
  }
}
