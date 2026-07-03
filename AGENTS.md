# HLS – AGENTS.md

## Stack
- **NestJS v11** (Express platform) – TypeScript, decorators, DI modules
- **Queue:** BullMQ + Redis (`@nestjs/bullmq`, `bullmq`, `ioredis`)
- **Transcoder:** FFmpeg (via `child_process.spawn`)
- **Player:** hls.js
- **Storage:** Local filesystem
- **Runtime:** `bun` (lockfile: `bun.lock`)

## Commands

| Command | What |
|---|---|
| `bun run build` | `nest build` (compile to `dist/`) |
| `bun run start:dev` | watch mode on `PORT ?? 3000` |
| `bun run lint` | ESLint + Prettier check, auto-fix |
| `bun run format` | Prettier write (single quotes, trailing commas) |
| `bun run test` | unit tests (`*.spec.ts` via Jest + ts-jest) |
| `bun run test:e2e` | e2e tests (`test/*.e2e-spec.ts`) |
| `bun run test:cov` | coverage to `coverage/` |

## Project structure

```
src/
├── main.ts                           # bootstrap (NO static asset serving yet)
├── app.module.ts                     # root module — has dead imports, typo
├── app.controller.ts                 # GET / → "Hello World!"
├── app.service.ts
├── upload/
│   ├── upload.module.ts              # ✅ imports BullQueue('transcode')
│   ├── upload.controller.ts          # ✅ POST /upload (500 MB, video/mp4 only)
│   ├── upload.service.ts             # ✅ saves to storage/uploads/, enqueues
│   ├── upload.controller.spec.ts
│   ├── upload.service.spec.ts
│   ├── dto/create-upload.dto.ts      # empty shell
│   └── entities/upload.entity.ts     # empty shell
├── transcode/
│   ├── transcode.module.ts           # ✅ imports BullQueue('transcode')
│   ├── transcode.processor.ts        # ⚠️ STUB — no FFmpeg logic
│   └── transcode.constants.ts        # ✅ 4 ABR presets (1080p–360p)
├── video/
│   ├── video.controller.ts           # 💀 dead — posts to separate 'hls' queue
│   └── video.controller.spec.ts
├── worker/
│   ├── worker.service.ts             # 💀 dead — processes 'hls' queue (simulated progress)
│   └── worker.service.spec.ts
├── app.controller.spec.ts
├── app.module.ts                     # 💀 has typo imports + dead providers
└── main.ts                           # ⚠️ missing static serving, body limit

storage/
├── uploads/                          # raw uploaded videos
└── hls/                              # empty — no HLS output yet

test/
├── jest-e2e.json
└── app.e2e-spec.ts
```

## Design spec

Full spec at `docs/superpowers/specs/2026-06-28-hls-streaming-demo-design.md`.
The pipeline: `POST /upload → BullMQ → FFmpeg spawn → storage/hls/{id}/ → GET /stream/{id} (hls.js)`.

## Progress against spec

| Task | Status |
|---|---|
| **Task 1** — Setup & deps (Redis, packages, dirs) | ✅ Done |
| **Task 2** — UploadModule (POST /upload, save, enqueue) | ✅ Done |
| **Task 3.1** — transcode constants (ABR presets) | ✅ Done |
| **Task 3.2** — transcode module | ✅ Done |
| **Task 3.3** — transcode processor (FFmpeg spawn + master.m3u8) | ❌ Stub |
| **Task 3.4** — master.m3u8 write after FFmpeg | ❌ Not implemented |
| **Task 4** — StreamModule (GET /job/:id, GET /stream/:id, player) | ❌ Missing |
| **Task 5.1** — BullModule.forRoot | ✅ Done |
| **Task 5.2** — Express static serving (hls + hls.js) | ❌ Missing in main.ts |
| **Task 5.3** — File upload config (body limit, MIME types) | ⚠️ Partial |
| **Task 6** — End-to-end test | ❌ Not runnable |

## Known issues (bugs, not just missing features)

- `app.module.ts:8` imports `'vidoe_queue_event'` (typo, file doesn't exist)
- `app.module.ts:18` registers queue `'hls'` — unused; actual queue is `'transcode'`
- `app.module.ts:23` registers `VideoQueueEventListiener` (typo, doesn't exist)
- `app.module.ts:24,26` registers `WorkerService` twice
- `VideoController` posts to `'hls'` queue — dead code, should be removed
- `WorkerService` processes `'hls'` queue with fake progress — dead code, should be removed
- `upload.controller.ts:19` only allows `video/mp4` — spec wants broader list
- `tsconfig.json` uses `module: "nodenext"` — `main.ts` works (no top-level await) but bare specifier `src/transcode/...` imports may cause issues under strict ESM

## Style

- **Prettier**: single quotes, trailing commas, `endOfLine: auto`.
- **ESLint**: `@typescript-eslint/no-explicit-any` disabled, `no-floating-promises` and `no-unsafe-argument` are warnings.
- **Testing**: Jest with `ts-jest` transform, `testEnvironment: node`.

## Generated code

- `dist/` is deleted before each build (`deleteOutDir: true` in nest-cli.json).
