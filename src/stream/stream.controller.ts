import { Controller, Get, Param } from '@nestjs/common';
import { StreamService } from './stream.service';

@Controller()
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Get('job/:id')
  findOne(@Param('id') id: string) {
    return this.streamService.getJobStatus(id);
  }

  @Get('stream/:id')
  getPlayer(@Param('id') id: string) {
    return this.streamService.getPlayerPage(id);
  }
}
