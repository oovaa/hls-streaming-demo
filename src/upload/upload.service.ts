import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { randomUUID } from 'crypto';
import { writeFile } from 'fs/promises';
import { TRANSCODE_QUEUE_NAME } from '../transcode/transcode.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  constructor(
    @InjectQueue(TRANSCODE_QUEUE_NAME) private readonly videoQueue: Queue,
    private configService: ConfigService,
  ) {}
  logger = new Logger(UploadService.name);
  async create(file: Express.Multer.File) {
    const upload_path = this.configService.get<string>('UPLOAD_PATH');

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

    this.logger.log('the jobId is', jobId);
    return { jobId, id };
  }
}
