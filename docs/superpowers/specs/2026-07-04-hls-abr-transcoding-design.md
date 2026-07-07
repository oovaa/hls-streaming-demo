# HLS ABR Transcoding — Design Spec

## Overview

Implement ABR HLS transcoding and serving for uploaded videos. Upload an MP4 → generate 4 quality renditions in HLS format → serve them back to the client via hls.js.

---

## The Flow

1. **POST /upload** — saves `<uuid>#file.mp4` to `storage/uploads/`, enqueues transcode job with `{ uuid, file_path }`
2. **TranscodeProcessor** picks up the job:
   - Spawns 4 parallel fluent-ffmpeg processes (one per ABR preset)
   - Each writes to `storage/hls/<uuid>/<preset>/`
   - Tracks per-rendition progress via `job.updateProgress({ 1080p: 45, ... })`
   - On process failure: logs details, retries that one process only (other 3 unaffected)
   - On all 4 complete: generates `master.m3u8` linking all variant playlists, deletes original upload from `storage/uploads/`
3. **GET /video/:uuid/:file** — catch-all serves files from `storage/hls/<uuid>/`

---

## Key Decisions

| Decision | Choice |
|---|---|
| Parallelism | 4 parallel ffmpeg processes (one per preset) |
| ABR presets | Use existing `ABR_PRESETS` from `../trasncode/transcode.constants.ts` (1080p/720p/480p/360p) |
| Job data shape | `{ uuid, file_path }` — presets read from constants |
| File layout | Subfolders: `storage/hls/<uuid>/1080p/`, `storage/hls/<uuid>/720p/`, etc. |
| Master playlist | Generated once during transcoding after all 4 renditions complete |
| Progress tracking | Per-rendition: `{ "1080p": 45, "720p": 60, ... }` |
| Error handling | Log details, retry the failed process; others unaffected |
| Serving | Catch-all route: `GET /video/:uuid/:file` |
| Original file | Delete only after all 4 renditions complete successfully |

---

## Source Files to Modify

- **`src/transcode/transcode.processor.ts`** — replace stub with fluent-ffmpeg parallel encoding
- **`../trasncode/transcode.constants.ts`** — may need segment/playlist naming config
- **`src/transcode/transcode.module.ts`** — possibly add providers if needed
- **New: `src/video/video.controller.ts`** — add `GET /video/:uuid/:file` endpoint
- **`src/app.module.ts`** — register any new controllers/providers

---

## Output Structure

```
storage/hls/<uuid>/
├── master.m3u8          # links to all 4 variant playlists
├── 1080p.m3u8           # variant playlist for 1080p
├── 1080p/
│   ├── segment0.ts
│   ├── segment1.ts
│   └── ...
├── 720p.m3u8
├── 720p/
│   ├── segment0.ts
│   └── ...
├── 480p.m3u8
├── 480p/
│   ├── segment0.ts
│   └── ...
├── 360p.m3u8
└── 360p/
    ├── segment0.ts
    └── ...
```

---

## Progress Tracking Shape

Job progress updated per-rendition as each ffmpeg process emits progress events:

```json
{
  "1080p": 45,
  "720p": 60,
  "480p": 75,
  "360p": 90
}
```

---

## Error Handling

If one of the 4 parallel ffmpeg processes fails:
1. Log the error details (preset name, ffmpeg stderr output, error message)
2. Retry that specific process only
3. Other 3 processes continue unaffected
4. Only after all 4 succeed is the job marked complete

---

## Cleanup Policy

Original uploaded file deleted from `storage/uploads/` **only after all 4 renditions complete successfully**. If any rendition fails after retries, the original file is preserved.
