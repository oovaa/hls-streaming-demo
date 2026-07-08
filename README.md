# HLS ABR Streaming Demo

<image alt="Nest Logo" src="https://nestjs.com/img/logo-small.svg" width="120" height="120" align="right" />

A NestJS-based HLS streaming solution with adaptive bitrate (ABR) transcoding.

## Overview

This project implements a complete HLS streaming pipeline:

1. **Upload** an MP4 video file via `POST /upload`
2. **Transcode** it in parallel using FFmpeg into 4 ABR quality levels (1080p, 720p, 480p, 360p) in HLS format
3. **Serve** the HLS segments via `GET /hls/{uuid}/master.m3u8` and a player page at `GET /stream/{uuid}`

The pipeline uses:
- **NestJS v11** (Express platform)
- **BullMQ** + Redis for job queuing
- **fluent-ffmpeg** for parallel ABR transcoding
- **HLS.js** for client-side playback (in frontend)
- **Bun** runtime for fast TypeScript compilation

## Quick Start

### Prerequisites

- Node.js v20+
- Bun
- FFmpeg installed (`ffmpeg -version`)
- Redis on localhost (port 6379)

### Installation

```bash
# Clone and change directory
cd hls

# Install dependencies
bun install

# Run tests
bun run test

# Build for production
bun run build

# Development (watch mode)
bun run start:dev
```

### Core Commands

| Command | What |
|---------|------|
| `bun run build` | Compile TypeScript to `dist/` |
| `bun run start:dev` | Run in watch mode on PORT 3000 |
| `bun run lint` | ESLint + Prettier check/fix |
| `bun run format` | Auto-format with Prettier |
| `bun run test` | Run unit tests |
| `bun run test:e2e` | Run e2e tests |

### Running Tests

```bash
# Unit tests (jest)
bun run test

# E2E tests
bun run test:e2e

# Test coverage
bun run test:cov
```

## Architecture

### Data Flow

1. **Upload** → saves MP4 to `storage/uploads/<uuid>#filename.mp4`
2. **Transcode** → enqueues `transcode` queue, spawns 4 parallel ffmpeg processes
3. **HLS Output** → writes to `storage/hls/<uuid>/` (one `.m3u8` + `.ts` segments per preset)
4. **Master Playlist** → generated after all 4 renditions complete
5. **Serving** → `main.ts` serves `storage/hls` under `/hls`; `GET /stream/{uuid}` returns an hls.js player page

### Directory Structure

```
storage/
├── uploads/      # Raw uploaded MP4 files
└── hls/          # HLS output (master.m3u8 + variant playlists + segments)
```

### Key Components

- **`UploadController`** — handles file upload (500MB max, MP4 only)
- **`TranscodeProcessor`** — parallel ffmpeg jobs, tracks progress, cleans up
- **`StreamController`** — `GET /job/{id}` (job status) and `GET /stream/{id}` (player page)
- **`main.ts`** — static serving: `/hls` → `storage/hls`, `/hls.js` → `node_modules/hls.js/dist`

## Quick Usage

### Upload a Video

```bash
curl -X POST -F "file=@video.mp4" http://localhost:3000/upload
```

This saves the video and enqueues the transcode job. Check logs for progress.

### Watch Transcoding Progress

In a terminal (running the app):
```
[TranscodeProcessor] Processing job abc123 for video uuid123
[TranscodeProcessor] Starting 1080p transcode
[TranscodeProcessor] Starting 720p transcode
[TranscodeProcessor] Starting 480p transcode
[TranscodeProcessor] Starting 360p transcode
[TranscodeProcessor] 1080p complete
[TranscodeProcessor] 720p complete
[TranscodeProcessor] 480p complete
[TranscodeProcessor] 360p complete
[TranscodeProcessor] All renditions complete for uuid123
[TranscodeProcessor] Deleted original: storage/uploads/uuid123#video.mp4
```

### Play HLS in Browser

Open the player page (served by `StreamController`):

```
http://localhost:3000/stream/<uuid>
```

Or use hls.js directly against the static HLS path:
```typescript
import Hls from 'hls.js';

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource('/hls/<uuid>/master.m3u8');
  hls.attachMedia(videoElement);
}
```

## Projects & Dependencies

### Core Libraries

- **`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`** — NestJS framework
- **`@nestjs/bullmq`** — BullMQ integration
- **`bullmq`, `ioredis`** — Job queues
- **`fluent-ffmpeg`** — Parallel ABR transcoding
- **`hls.js`** — HLS player

### Configuration

- **`tsconfig.build.json`** — Build-specific TypeScript config
- **`tsconfig.json`** — Development TypeScript config
- **`nest-cli.json`** — NestJS CLI (auto delete `dist/`)
- **`.prettierrc`**, **`eslint.config.mjs`** — Code style

## Project Files

- **`src/upload/upload.controller.ts`** — Upload endpoint
- **`src/upload/upload.service.ts`** — Saves file, enqueues transcode
- **`src/transcode/transcode.processor.ts`** — Parallel ffmpeg jobs
- **`src/transcode/transcode.constants.ts`** — ABR presets, segment config
- **`src/stream/stream.controller.ts`** — Job status + player page routes
- **`src/stream/stream.service.ts`** — Builds the hls.js player HTML
- **`src/app.module.ts`** — Root module (Upload + Transcode + Stream + BullMQ)

## Built with ❤️ using

[![Nest](https://nestjs.com/img/logo-small.svg)](https://nestjs.com)
[![Bun](https://github.com/oven-sh/bun/assets/2768712/2950b952-c060-44a6-9ed1-24a52bb119fb)](https://bun.sh)
[![Redis](https://raw.githubusercontent.com/redis/redis/7.x/logo/redis_logo.png)](https://redis.io)
[![FFmpeg](https://www.ffmpeg.org/assets/logo.png)](https://ffmpeg.org)

## License

This project is licensed under the MIT License.
