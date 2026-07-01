import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { randomUUID } from 'crypto';
import { writeFile } from 'fs/promises';
import { TRANSCODE_QUEUE_NAME } from 'src/transcode/transcode.constants';

@Injectable()
export class UploadService {
  constructor(
    @InjectQueue(TRANSCODE_QUEUE_NAME) private readonly videoQueue: Queue,
  ) {}
  async create(file: Express.Multer.File) {
    const jobId = randomUUID();
    const file_name = `${jobId}-${file.originalname}`;
    const file_path = `storage/uploads/${file_name}`;

    console.log('The File', file_name);

    try {
      await writeFile(file_path, file.buffer);
      console.log('file saved at', file_path);
    } catch (err) {
      console.log('found an error during saving the file ', err);
      throw new Error(err);
    }

    try {
      await this.videoQueue.add(jobId, {
        file_path: file_path,
        jobId,
      });
    } catch (err) {
      console.log('error during adding to the queue', err);
      throw new Error(err);
    }
    return { jobId };
  }
}
