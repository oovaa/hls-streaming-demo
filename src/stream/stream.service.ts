import { Injectable, Logger as Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { TRANSCODE_QUEUE_NAME } from '../transcode/transcode.constants';
import { Queue } from 'bullmq';

@Injectable()
export class StreamService {
  constructor(
    @InjectQueue(TRANSCODE_QUEUE_NAME) private readonly videoQueue: Queue,
  ) {}
  logger = new Logger(StreamService.name);
  async getJobStatus(id: string) {
    try {
      const job_details = await this.videoQueue.getJob(id);
      this.logger.log(`Geg the job details of the id: ${job_details?.id}`);
      return job_details;
    } catch (err) {
      this.logger.warn(`couldnt get the job id not found, ${err}`);
      return null;
    }
  }
  getPlayerPage(id: string) {
    return `
    <!DOCTYPE html>
    <html>
      <head><script src="/hls.js/hls.min.js"></script></head>
      <body>
        <video id="video" controls width="960"></video>
        <script>
          const video = document.getElementById('video');
          const src = '/hls/${id}/master.m3u8';
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
          }
        </script>
      </body>
    </html>`;
  }
}
