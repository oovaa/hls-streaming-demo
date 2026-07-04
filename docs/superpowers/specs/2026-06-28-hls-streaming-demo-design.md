# HLS Streaming Demo — Design Spec

## Goal

Build a local adaptive-bitrate HLS streaming pipeline to learn the full workflow: video upload, queue-backed transcoding into multiple ABR renditions, and serving those renditions for playback via hls.js.

## Stack

- **Runtime:** NestJS v11 (Express platform), Bun
- **Queue:** BullMQ + local Redis
- **Transcoder:** FFmpeg (via child process)
- **Player:** hls.js
- **Storage:** Local filesystem

## Architecture

```
User → [Upload API] → Saves file → Enqueues job → [BullMQ / Redis]
                                                      ↓
User ← [Stream API]  ← HLS files  ← [Transcode Worker / FFmpeg]
                           ↓
                    [hls.js Player]
```

### Flow

1. User uploads a video via `POST /upload`
2. Upload service saves the raw file to `storage/uploads/` and enqueues a BullMQ job
3. API returns `{ jobId }` immediately — client polls `GET /job/:id`
4. Transcode worker picks up the job, runs FFmpeg with 4 ABR presets, outputs HLS files to `storage/hls/{jobId}/`
5. Worker updates job status (`processing → done / failed`)
6. Client navigates to `GET /stream/:id` — serves a player page with hls.js pointing at the HLS files

## ABR Renditions

| Quality | Resolution | Bitrate  | Audio Bitrate |
| ------- | ---------- | -------- | ------------- |
| 1080p   | 1920×1080  | 5 Mbps   | 128 Kbps      |
| 720p    | 1280×720   | 3 Mbps   | 96 Kbps       |
| 480p    | 854×480    | 1.5 Mbps | 64 Kbps       |
| 360p    | 640×360    | 800 Kbps | 64 Kbps       |

FFmpeg produces a master `master.m3u8` pointing to each rendition's sub-playlist and TS segments.

## Modules

### UploadModule

| File                   | Responsibility                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| `upload.controller.ts` | `POST /upload` — accepts multipart video file, delegates to service   |
| `upload.service.ts`    | Saves file to `storage/uploads/`, enqueues BullMQ job, returns job ID |
| `upload.module.ts`     | Registers controller + service, imports BullMQ                        |

### TranscodeModule

| File                     | Responsibility                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `transcode.processor.ts` | BullMQ `@Processor`, runs FFmpeg with ABR presets, writes HLS to `storage/hls/{jobId}/`, updates job status |
| `transcode.constants.ts` | ABR preset definitions (resolution, bitrate, codec config)                                                  |
| `transcode.module.ts`    | Registers queue + worker, connects to Redis                                                                 |

### StreamModule

| File                   | Responsibility                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `stream.controller.ts` | `GET /job/:id` — returns job status; `GET /stream/:id` — serves HLS files + player page |
| `stream.service.ts`    | Reads job status from BullMQ; builds and serves the hls.js player HTML page             |
| `stream.module.ts`     | Registers controller + service                                                          |

## Directory Structure (Project Root)

```
src/
├── upload/
│   ├── upload.module.ts
│   ├── upload.controller.ts
│   └── upload.service.ts
├── transcode/
│   ├── transcode.module.ts
│   ├── transcode.processor.ts
│   └── transcode.constants.ts
├── stream/
│   ├── stream.module.ts
│   ├── stream.controller.ts
│   └── stream.service.ts
├── app.module.ts
└── main.ts

storage/
├── uploads/
└── hls/{jobId}/
    ├── master.m3u8
    ├── 360p.m3u8
    ├── 480p.m3u8
    ├── 720p.m3u8
    ├── 1080p.m3u8
    └── segments/

test/
└── ...
```

## Dependencies to Add

- `@nestjs/bullmq` + `bullmq` — queue infrastructure
- `ioredis` — Redis client for BullMQ
- `multer` — file upload handling (NestJS built-in)
- `hls.js` — client-side player (served as static asset)
- `@types/multer` — dev dependency

## Out of Scope

- Authentication / authorization
- Database persistence (status is ephemeral in BullMQ)
- Cloud deployment (S3, MediaConvert, CloudFront)
- DRM or encryption
- Thumbnail generation

---

## Implementation Plan

### Task 1 — Project Setup & Dependencies

**Subtask 1.1 – Install Redis**

- Check if Redis is installed locally (`redis-cli ping`)
- If not, install via `sudo apt install redis-server` (Linux) or `brew install redis` (macOS)
- Start Redis: `redis-server --daemonize yes`

**Subtask 1.2 – Install npm packages**

- `bun add @nestjs/bullmq bullmq ioredis`
- `bun add -D @types/multer`
- `bun add hls.js` (placed in `public/hls.js/` for static serving)
- Verify `package.json` updated and `bun.lock` generated

**Subtask 1.3 – Create storage directories**

- `mkdir -p storage/uploads storage/hls`

---

### Task 2 — UploadModule

**Subtask 2.1 – `upload/upload.module.ts`**

- Import `BullModule.registerQueue({ name: 'transcode' })`
- Register `UploadController` and `UploadService` in `providers` and `controllers`
- Export the module

**Subtask 2.2 – `upload/upload.controller.ts`**

- `@Post('upload')` with `@UseInterceptors(FileInterceptor('file'))`
- Accept `@UploadedFile()` (multer `Express.Multer.File`)
- Call `uploadService.upload()` with the file buffer and original name
- Return `{ jobId }`

**Subtask 2.3 – `upload/upload.service.ts`**

- Save file buffer to `storage/uploads/{uuid}-{originalName}`
- Inject `@InjectQueue('transcode')` and call `queue.add('transcode', { filePath, jobId })`
- Return the BullMQ `job.id` as the `jobId`

---

### Task 3 — TranscodeModule

**Subtask 3.1 – `transcode/transcode.constants.ts`**

- Define array of ABR preset objects: `{ name, width, height, videoBitrate, audioBitrate }`
- Include all 4 tiers (1080p, 720p, 480p, 360p)

**Subtask 3.2 – `transcode/transcode.module.ts`**

- Import `BullModule.registerQueue({ name: 'transcode' })`
- Register `TranscodeProcessor` in `providers`
- Configure BullMQ root connection in `AppModule` (or here)

**Subtask 3.3 – `transcode/transcode.processor.ts`**

- Annotate with `@Processor('transcode')`
- `@Process('transcode')` handler receives `{ filePath, jobId }`
- Steps inside the handler:
  1. Create output dir: `storage/hls/{jobId}/`
  2. Report `progress(10)` — started
  3. Build FFmpeg arguments array for multi-variant HLS encoding
  4. Spawn FFmpeg via `child_process.spawn()` with `stdio: 'inherit'`
  5. Wait for FFmpeg to finish (wrap in Promise)
  6. On success: write `master.m3u8` manifest, update progress to 100
  7. On failure: throw, BullMQ marks job as failed

**The FFmpeg ABR command pattern:**

```bash
ffmpeg -i input.mp4 \
  -filter_complex \
    "[0:v]scale=1920:1080[v1080];[0:v]scale=1280:720[v720];[0:v]scale=854:480[v480];[0:v]scale=640:360[v360];\
     [0:a]aformat=sample_rates=48000:channel_layouts=stereo[a1080];\
     [0:a]aformat=sample_rates=48000:channel_layouts=stereo[a720];\
     [0:a]aformat=sample_rates=48000:channel_layouts=stereo[a480];\
     [0:a]aformat=sample_rates=48000:channel_layouts=stereo[a360]" \
  -map "[v1080]" -map "[a1080]" -c:v libx264 -b:v:0 5M -c:a aac -b:a:0 128k \
    -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename storage/hls/{jobId}/1080p_%03d.ts \
    storage/hls/{jobId}/1080p.m3u8 \
  -map "[v720]" -map "[a720]" -c:v libx264 -b:v:1 3M -c:a aac -b:a:1 96k \
    -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename storage/hls/{jobId}/720p_%03d.ts \
    storage/hls/{jobId}/720p.m3u8 \
  -map "[v480]" -map "[a480]" -c:v libx264 -b:v:2 1.5M -c:a aac -b:a:2 64k \
    -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename storage/hls/{jobId}/480p_%03d.ts \
    storage/hls/{jobId}/480p.m3u8 \
  -map "[v360]" -map "[a360]" -c:v libx264 -b:v:3 800k -c:a aac -b:a:3 64k \
    -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename storage/hls/{jobId}/360p_%03d.ts \
    storage/hls/{jobId}/360p.m3u8
```

Single FFmpeg call — one input, 4 video+audio outputs, filter_complex for scaling.

**Subtask 3.4 – Write `master.m3u8` after FFmpeg succeeds**

```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
```

---

### Task 4 — StreamModule

**Subtask 4.1 – `stream/stream.module.ts`**

- Register `StreamController` and `StreamService`
- Import `BullModule.registerQueue({ name: 'transcode' })` to access job state

**Subtask 4.2 – `stream/stream.controller.ts`**

- `GET /job/:id` — returns job status from BullMQ via `streamService.getJobStatus(id)`
- `GET /stream/:id` — returns an HTML page with hls.js player via `streamService.getPlayerPage(id)`
- NestJS static file serving for `storage/hls/:id/*` files (configure Express static)
  streamcon
  **Subtask 4.3 – `stream/stream.service.ts`**
- `getJobStatus(jobId)` — fetch BullMQ job, return `{ id, status, progress }`
- `getPlayerPage(jobId)` — return an HTML string with the hls.js player

**Subtask 4.4 – hls.js Player HTML page**

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="/hls.js/hls.min.js"></script>
  </head>
  <body>
    <video id="video" controls width="960"></video>
    <script>
      const video = document.getElementById('video');
      const src = '/hls/{jobId}/master.m3u8';
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      }
    </script>
  </body>
</html>
```

---

### Task 5 — Wire It Up

**Subtask 5.1 – Configure BullMQ root in `app.module.ts`**

- Add `BullModule.forRoot({ connection: { host: 'localhost', port: 6379 } })`
- Import `UploadModule`, `TranscodeModule`, `StreamModule`
- Remove any remaining boilerplate imports

**Subtask 5.2 – Configure Express static serving in `main.ts`**

- `app.useStaticAssets(join(__dirname, '..', 'storage', 'hls'), { prefix: '/hls' })` — serve HLS files
- `app.useStaticAssets(join(__dirname, '..', 'node_modules', 'hls.js', 'dist'), { prefix: '/hls.js' })` — serve hls.js library
- Increase body size limit: `app.use(json({ limit: '500mb' }))`

**Subtask 5.3 – File upload config**

- In `UploadController`, configure `FileInterceptor` with `limits: { fileSize: 500 * 1024 * 1024 }` (500 MB)
- Accept video MIME types: `video/mp4`, `video/quicktime`, `video/x-msvideo`, etc.

---

### Task 6 — Test the Full Pipeline

**Subtask 6.1 – Start Redis**

- `redis-server --daemonize yes` (or `brew services start redis`)

**Subtask 6.2 – Start the app**

- `bun run start:dev`

**Subtask 6.3 – Upload a video**

```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@/path/to/test-video.mp4"
# → { "jobId": "1" }
```

**Subtask 6.4 – Poll job status**

```bash
curl http://localhost:3000/job/1
# → { "id": "1", "status": "processing", "progress": 42 }
```

**Subtask 6.5 – Open player**

- Browser → `http://localhost:3000/stream/1`
- Verify hls.js loads and video plays with ABR switching

**Subtask 6.6 – Verify HLS output**

```bash
ls -la storage/hls/1/
# Should show: master.m3u8 1080p.m3u8 720p.m3u8 480p.m3u8 360p.m3u8 *_.ts
```
