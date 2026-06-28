# HLS – AGENTS.md

## Stack
- **NestJS v11** (Express platform) – TypeScript, decorators, DI modules
- **AWS SDK v3** (`@aws-sdk/client-mediaconvert`) – video transcoding to HLS
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
├── main.ts                  # bootstrap entrypoint
├── app.module.ts            # root module
├── app.controller.ts        # GET / → "Hello World!"
├── app.service.ts
├── abs/
│   └── abs.module.ts        # empty placeholder module
└── generation/
    ├── generation.service.ts        # HLS/MediaConvert logic
    ├── generation.service.spec.ts
    └── abs-generation.constants.ts  # MediaConvert output presets + placeholder config
test/
├── jest-e2e.json
└── app.e2e-spec.ts
```

## Architecture notes

- `GenerationService` is the core: builds MediaConvert job outputs for adaptive-bitrate HLS. Currently incomplete.
- `AbsModule` is a shell – no controllers, services, or providers yet.
- App runs on `PORT` env var (default `3000`).
- Unit tests co-located with source; e2e tests in `test/`.

## Known issues (WIP code)

- `triggerHLSContentGeneration()` has a stub body — needs MediaConvert job submission.
- `GenerateAbsContent()` hardcodes `1080` — should accept input video height to determine quality tiers.
- `abs-generation.constants.ts` contains placeholder ARNs and private key — must be replaced with real values.
- `AbsModule` is empty — no controllers, services, or providers registered.
- `main.ts` top-level `await` fails `nest build` with CommonJS target (`module: "nodenext"` in tsconfig treats `.ts` as CJS).

## Style

- **Prettier**: single quotes, trailing commas, `endOfLine: auto`.
- **ESLint**: `@typescript-eslint/no-explicit-any` disabled, `no-floating-promises` and `no-unsafe-argument` are warnings.
- **Testing**: Jest with `ts-jest` transform, `testEnvironment: node`.

## Generated code

- `dist/` is deleted before each build (`deleteOutDir: true` in nest-cli.json).
