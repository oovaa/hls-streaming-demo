import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TRANSCODE_QUEUE_NAME } from 'src/transcode/transcode.constants';

@Processor(TRANSCODE_QUEUE_NAME)
export class TranscodeProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    // do some stuff
    console.log(job);
  }

  @OnWorkerEvent('completed')
  onCompleted() {
    // do some stuff
  }
}
