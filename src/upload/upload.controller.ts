import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        const allowed = ['video/mp4'];

        if (allowed.includes(file.mimetype)) cb(null, true);
        else {
          console.error(`File rejected: unsupported mimetype ${file.mimetype}`);
          cb(null, false);
        }
      },
    }),
  )
  create(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.create(file);
  }
}
