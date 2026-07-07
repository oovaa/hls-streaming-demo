import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { TRANSCODE_QUEUE_NAME } from 'src/transcode/transcode.constants';
import { Queue } from 'bullmq';

@Injectable()
export class StreamService {
  constructor(
    @InjectQueue(TRANSCODE_QUEUE_NAME) private readonly videoQueue: Queue,
  ) {}
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
