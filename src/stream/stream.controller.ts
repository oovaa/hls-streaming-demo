import { Controller, Get, Post, Param } from '@nestjs/common';
import { StreamService } from './stream.service';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Get('job/:id')
  findOne(@Param('id') id: string) {
    return this.streamService.getJobStatus(id);
  }

  @Get(':id')
  getPlayer(@Param('id') id: string) {
    return this.streamService.getPlayerPage(id);
  }
}
