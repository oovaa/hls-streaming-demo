import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Post } from '@nestjs/common';
import { Queue } from 'bullmq';

@Controller('videos')
export class VideoController {
  constructor() {}
}
