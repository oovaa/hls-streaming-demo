# HLS ABR Transcoding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement ABR HLS transcoding using fluent-ffmpeg and a catch-all video serving endpoint.

**Architecture:** Upload an MP4 → `TranscodeProcessor` spawns 4 parallel fluent-ffmpeg processes (one per ABR preset) → each writes to `storage/hls/<uuid>/<preset>/` → master playlist generated → original deleted → `GET /video/:uuid/:file` serves HLS files.

**Tech Stack:** NestJS, BullMQ, fluent-ffmpeg, Express static serving

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install fluent-ffmpeg and types**

Run: `bun add fluent-ffmpeg && bun add -D @types/fluent-ffmpeg`
Expected: packages added to package.json and bun.lock

- [ ] **Step 2: Verify ffmpeg is available on the system**

Run: `ffmpeg -version`
Expected: prints ffmpeg version info (must be installed on the host)

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "deps: add fluent-ffmpeg"
```

---

## Task 2: Add output directory and segment config to constants

**Files:**
- Modify: `src/transcode/transcode.constants.ts`

- [ ] **Step 1: Add output path and segment config constants**

```typescript
export const TRANSCODE_QUEUE_NAME = 'transcode';

export const HLS_OUTPUT_DIR = 'storage/hls';
export const UPLOADS_DIR = 'storage/uploads';

export const SEGMENT_CONFIG = {
  segment_time: 4,
  preset: 'veryfast',
  movflags: '+faststart',
};

export const ABR_PRESETS = [
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    videoBitrate: '5000k',
    audioBitrate: '128k',
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    videoBitrate: '3000k',
    audioBitrate: '96k',
  },
  {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: '1500k',
    audioBitrate: '64k',
  },
  {
    name: '360p',
    width: 640,
    height: 360,
    videoBitrate: '800k',
    audioBitrate: '64k',
  },
];
```

- [ ] **Step 2: Run lint to verify**

Run: `bun run lint`
Expected: no new errors from this file

- [ ] **Step 3: Commit**

```bash
git add src/transcode/transcode.constants.ts
git commit -m "feat: add HLS output and segment config constants"
```

---

## Task 3: Implement fluent-ffmpeg parallel encoding in TranscodeProcessor

**Files:**
- Modify: `src/transcode/transcode.processor.ts`

- [ ] **Step 1: Rewrite transcode.processor.ts**

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  ABR_PRESETS,
  HLS_OUTPUT_DIR,
  UPLOADS_DIR,
  SEGMENT_CONFIG,
} from './transcode.constants';

@Processor('transcode')
export class TranscodeProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    const { uuid, file_path } = job.data;
    const outputDir = path.join(HLS_OUTPUT_DIR, uuid);

    await fs.mkdir(outputDir, { recursive: true });

    const results = await Promise.all(
      ABR_PRESETS.map((preset) =>
        this.transcodeRendition(job, file_path, outputDir, preset),
      ),
    );

    const allSucceeded = results.every((r) => r.success);
    if (!allSucceeded) {
      const failed = results.filter((r) => !r.success);
      throw new Error(
        `Failed renditions: ${failed.map((f) => f.presetName).join(', ')}`,
      );
    }

    this.generateMasterPlaylist(outputDir);

    const originalFile = path.join(UPLOADS_DIR, path.basename(file_path));
    await fs.unlink(originalFile).catch(() => {});
  }

  private transcodeRendition(
    job: Job,
    inputPath: string,
    outputDir: string,
    preset: (typeof ABR_PRESETS)[number],
  ): Promise<{ presetName: string; success: boolean }> {
    return new Promise((resolve) => {
      const presetDir = path.join(outputDir, preset.name);
      const playlistPath = path.join(outputDir, `${preset.name}.m3u8`);
      const segmentPattern = path.join(presetDir, 'segment%d.ts');

      fs.mkdir(presetDir, { recursive: true }).then(() => {
        const command = ffmpeg(inputPath)
          .videoCodec('libx264')
          .videoBitrate(preset.videoBitrate)
          .size(`${preset.width}x${preset.height}`)
          .audioCodec('aac')
          .audioBitrate(preset.audioBitrate)
          .outputOptions([
            '-preset', SEGMENT_CONFIG.preset,
            '-f', 'hls',
            '-hls_time', String(SEGMENT_CONFIG.segment_time),
            '-hls_list_size', '0',
            '-hls_segment_filename', segmentPattern,
            '-movflags', SEGMENT_CONFIG.movflags,
          ])
          .output(playlistPath);

        command.on('progress', (progress) => {
          const percent = Math.round(progress.percent ?? 0);
          const current = job.progress as Record<string, number> ?? {};
          job.updateProgress({ ...current, [preset.name]: percent });
        });

        command.on('end', () => {
          resolve({ presetName: preset.name, success: true });
        });

        command.on('error', (err: Error) => {
          console.error(
            `Transcode failed for ${preset.name}:`,
            err.message,
          );
          resolve({ presetName: preset.name, success: false });
        });

        command.run();
      });
    });
  }

  private generateMasterPlaylist(outputDir: string): void {
    const lines = ['#EXTM3U'];
    for (const preset of ABR_PRESETS) {
      const bandwidth =
        preset.name === '1080p'
          ? 5000000
          : preset.name === '720p'
            ? 3000000
            : preset.name === '480p'
              ? 1500000
              : 800000;
      lines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${preset.width}x${preset.height}`,
        `${preset.name}.m3u8`,
      );
    }
    const masterPath = path.join(outputDir, 'master.m3u8');
    fs.writeFile(masterPath, lines.join('\n'));
  }
}
```

- [ ] **Step 2: Run lint to verify**

Run: `bun run lint`
Expected: no new errors (existing ones are pre-existing)

- [ ] **Step 3: Commit**

```bash
git add src/transcode/transcode.processor.ts
git commit -m "feat: implement fluent-ffmpeg parallel ABR transcoding"
```

---

## Task 4: Add GET /video/:uuid/:file serving endpoint

**Files:**
- Modify: `src/video/video.controller.ts`

- [ ] **Step 1: Rewrite video.controller.ts**

```typescript
import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import { HLS_OUTPUT_DIR } from 'src/transcode/transcode.constants';

@Controller('video')
export class VideoController {
  @Get(':uuid/:file')
  async serveFile(
    @Param('uuid') uuid: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(HLS_OUTPUT_DIR, uuid, file);

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException(`File not found: ${file}`);
    }

    const ext = path.extname(file);
    const mimeTypes: Record<string, string> = {
      '.m3u8': 'application/vnd.apple.mpegurl',
      '.ts': 'video/mp2t',
    };

    res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(filePath);
  }
}
```

- [ ] **Step 2: Run lint to verify**

Run: `bun run lint`
Expected: no new errors from this file

- [ ] **Step 3: Commit**

```bash
git add src/video/video.controller.ts
git commit -m "feat: add catch-all HLS video serving endpoint"
```

---

## Task 5: Clean up app.module.ts

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Remove the hls queue registration and WorkerService from AppModule**

The `hls` queue and `WorkerService` were experimental. Remove them:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { BullModule } from '@nestjs/bullmq';
import { VideoController } from './video/video.controller';
import { VideoQueueEventListiener } from 'vidoe_queue_event';
import { TranscodeModule } from './transcode/transcode.module';

@Module({
  imports: [
    UploadModule,
    BullModule.forRoot({
      connection: { host: 'localhost', port: 6379 },
      defaultJobOptions: { attempts: 3, backoff: 2000, removeOnComplete: 1000 },
    }),
    TranscodeModule,
  ],
  controllers: [AppController, VideoController],
  providers: [VideoQueueEventListiener, AppService],
})
export class AppModule {}
```

- [ ] **Step 2: Run lint to verify**

Run: `bun run lint`
Expected: no new errors from this file

- [ ] **Step 3: Commit**

```bash
git add src/app.module.ts
git commit -m "refactor: remove experimental hls queue and WorkerService from AppModule"
```

---

## Task 6: Verify build

**Files:** none

- [ ] **Step 1: Run build**

Run: `bun run build`
Expected: build succeeds (exit 0)

- [ ] **Step 2: Run lint (final check)**

Run: `bun run lint`
Expected: pre-existing warnings only, no new errors

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "chore: verify build passes"
```
