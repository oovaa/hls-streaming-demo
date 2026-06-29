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
      fileFilter: (_req, file, cb) => {
        const allowed = ['video/mp4'];
        // cb(null, allowed.includes(file.mimetype));
        if (allowed.includes(file.mimetype)) cb(null, true);
        else {
          console.log('file isnt supported', file.mimetype);
          // throw new Error('Not supported file ' + file.mimetype);
          cb(null, false);
        }
      },
    }),
  )
  create(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.create(file);
  }
}
