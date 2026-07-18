import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { randomUUID } from 'crypto';
import { writeFile } from 'fs/promises';
import { TRANSCODE_QUEUE_NAME } from '../transcode/transcode.constants';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { UPLOAD_PATH } from './upload.constants';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { video } from 'src/schema';
import path from 'path';

@Injectable()
export class UploadService {
  constructor(
    @InjectQueue(TRANSCODE_QUEUE_NAME) private readonly videoQueue: Queue,
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<{video: typeof video}>,
  ) {}
  logger = new Logger(UploadService.name);
  async create(file: Express.Multer.File) {
    const upload_path = UPLOAD_PATH 
    const id = randomUUID();
    const file_name = `${id}#${file.originalname}`;
    const file_path = `${upload_path}/${file_name}`;
    let jobId: string | undefined;
    this.logger.log('The File', file_name);

    try {
      await writeFile(file_path, file.buffer);
      this.logger.log('file saved at', file_path);
    } catch (err) {
      this.logger.error('found an error during saving the file ', err);
      throw new Error(err);
    }

    try {
      jobId = (
        await this.videoQueue.add(id, {
          file_path: file_path,
          id,
        })
      ).id;
    } catch (err) {
      this.logger.error('error during adding to the queue', err);
      throw new Error(err);
    }

    try {
     await  this.db.insert(video).values({file_name, path: file_path})
    } catch (err) {
      
    }


    this.logger.log('the jobId is', jobId);
    return { jobId, id };
  }
}
