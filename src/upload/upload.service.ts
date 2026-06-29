import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { TRANSCODE_QUEUE_NAME } from 'src/app.module';
import { randomUUID } from 'crypto';
import { writeFile } from 'fs/promises';

@Injectable()
export class UploadService {
  constructor(
    @InjectQueue(TRANSCODE_QUEUE_NAME) private readonly videoQueue: Queue,
  ) {}
  async create(file: Express.Multer.File) {
    const jobId = randomUUID();

    const file_name = `${jobId}-${file.originalname}`;
    console.log('The File', file_name);

    try {
      await writeFile(`storage/uploads/${file_name}`, file.buffer);
    } catch (err) {
      console.log('found an error during saving the file ', err);
      throw new Error(err);
    }

    try {
      await this.videoQueue.add('video_' + randomUUID(), {
        file_path: 'storage/uploads/' + file_name,
        jobId,
      });
    } catch (err) {
      console.log('error during adding to the queue', err);
      throw new Error(err);
    }
    return { jobId };
  }
}
