# HLS – AGENTS.md

## Stack
- **NestJS v11** (Express platform) — TypeScript, decorators, DI
- **Queue:** BullMQ + Redis (`@nestjs/bullmq`, `bullmq`, `ioredis`)
- **Transcoder:** fluent-ffmpeg (wraps `ffmpeg` via `child_process`)
- **Player:** hls.js (served from `node_modules`, not bundled)
- **Runtime:** `bun` (lockfile: `bun.lock`); scripts also work via `nest`/`jest` directly

## Commands

| Command | What |
|---|---|
| `bun run build` | `nest build` → `dist/` (deleted first via `deleteOutDir`) |
| `bun run start:dev` | watch mode, `PORT ?? 3000` |
| `bun run lint` | ESLint + Prettier, auto-fix |
| `bun run format` | Prettier write (`src/**/*.ts`, `test/**/*.ts`) |
| `bun run test` | jest unit (`*.spec.ts`, rootDir `src`) |
| `bun run test:e2e` | e2e (`test/*.e2e-spec.ts`) |
| `bun run test -- <file>` / `-t <name>` | run a single spec / case |

`lint` uses `typescript-eslint` `recommendedTypeChecked`, so it type-checks
through `projectService` — type errors surface as lint failures, not just style.

## Architecture / pipeline
- `POST /upload` (UploadController) — `video/mp4` only, 500 MB cap. Saves to
  `storage/uploads/<uuid>#<filename>` and enqueues a `transcode` BullMQ job
  `{ uuid, file_path }`.
- `TranscodeProcessor` (`@Processor('transcode')`) — spawns **4 parallel**
  ffmpeg renditions (fluent-ffmpeg) → `storage/hls/<uuid>/<preset>.m3u8` + `.ts`
  segments, writes `master.m3u8`, then deletes the original upload.
- `main.ts` static serving (not a controller): `/hls` → `storage/hls`,
  `/hls.js` → `node_modules/hls.js/dist` (player at `/hls.js/hls.min.js`).
- `GET /job/:id` — transcoding job status. `GET /stream/:id` — HTML player
  page that loads `/hls/<id>/master.m3u8`.
- Storage paths in `transcode/transcode.constants.ts` (`HLS_OUTPUT_DIR`,
  `UPLOADS_DIR`) are **relative to cwd (repo root)** — run from the root.
- Prerequisites: **Redis on localhost:6379** (BullModule.forRoot) and
  **ffmpeg on PATH**. E2E/integration can't run without both.

## Gotchas / dead code
- `video/VideoController` (`POST /process`), `worker/WorkerService`
  (`@Processor('hls')`), and the root `vidoe_queue_event.ts` are **dead** — not
  registered in any module and reference a nonexistent `'hls'` queue. Don't
  build on them; the real queue is `'transcode'`.
- Upload allowlist is `video/mp4` only (contrary to earlier spec drafts).
- README claims HLS is served at `/video/<uuid>/...` — that is stale; the real
  path is `/hls/<uuid>/...`.
- Design spec lives at `docs/superpowers/specs/2026-06-28-hls-streaming-demo-design.md`.

## Style
- **Prettier**: single quotes, `trailingComma: all`, `endOfLine: auto`.
- **ESLint**: `@typescript-eslint/no-explicit-any` off; `no-floating-promises`
  and `no-unsafe-argument` are **warnings** (won't fail CI on their own).
