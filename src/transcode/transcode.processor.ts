import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  ABR_PRESETS,
  HLS_OUTPUT_DIR,
  UPLOADS_DIR,
  SEGMENT_CONFIG,
  TRANSCODE_QUEUE_NAME,
} from './transcode.constants';

/**
 * TranscodeProcessor picks up jobs from the 'transcode' queue.
 * Each job carries { uuid, file_path } — the UUID from upload
 * and the path to the saved MP4.
 *
 * It spawns 4 parallel ffmpeg processes (one per ABR preset),
 * writes HLS output to storage/hls/<uuid>/, and generates
 * a master.m3u8 linking all variant playlists.
 */
@Processor(TRANSCODE_QUEUE_NAME)
export class TranscodeProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscodeProcessor.name);

  async process(job: Job): Promise<void> {
    const { id: uuid, file_path } = job.data;
    this.logger.log(`Processing job ${job.id} for video ${uuid}`);

    // Create the output directory for this video
    const outputDir = path.join(HLS_OUTPUT_DIR, uuid);
    await fs.mkdir(outputDir, { recursive: true });

    // Spawn 4 parallel ffmpeg processes — one per quality level
    const results = await Promise.all(
      ABR_PRESETS.map((preset) =>
        this.transcodeRendition(job, file_path, outputDir, preset),
      ),
    );

    // If any rendition failed, throw so BullMQ marks the job as failed
    const failed = results.filter((r) => !r.success);
    if (failed.length) {
      this.logger.error(
        `Job ${job.id} failed: ${failed.map((f) => f.presetName).join(', ')}`,
      );
      throw new Error(
        `Failed renditions: ${failed.map((f) => f.presetName).join(', ')}`,
      );
    }

    // All 4 succeeded — generate the master playlist and clean up
    this.logger.log(`All renditions complete for ${uuid}`);
    await this.generateMasterPlaylist(outputDir);

    // Delete the original upload
    const originalFile = path.join(UPLOADS_DIR, path.basename(file_path));
    await fs.unlink(originalFile).catch(() => {});
    this.logger.log(`Deleted original: ${originalFile}`);
  }

  /**
   * Transcode a single ABR rendition.
   * Returns { presetName, success } so the caller knows which ones failed.
   */
  private async transcodeRendition(
    job: Job,
    inputPath: string,
    outputDir: string,
    preset: (typeof ABR_PRESETS)[number],
  ): Promise<{ presetName: string; success: boolean }> {
    // Playlist goes at the root: storage/hls/<uuid>/1080p.m3u8
    const playlistPath = path.join(outputDir, `${preset.name}.m3u8`);
    // Segments in the root with preset prefix: storage/hls/<uuid>/1080p_000.ts
    const segmentPattern = path.join(outputDir, `${preset.name}_%03d.ts`);
    this.logger.log(`Starting ${preset.name} transcode`);

    return new Promise((resolve) => {
      // Build the ffmpeg command using fluent-ffmpeg API
      const command = ffmpeg(inputPath)
        // Map all streams from input (video + audio)
        .outputOptions(['-map', '0'])
        // Video settings
        .videoCodec('libx264')
        .videoBitrate(preset.videoBitrate)
        .size(`${preset.width}x${preset.height}`)
        // Audio settings
        .audioCodec('aac')
        .audioBitrate(preset.audioBitrate)
        // HLS output settings
        .outputOptions([
          '-preset',
          SEGMENT_CONFIG.preset,
          '-f',
          'hls',
          '-hls_time',
          String(SEGMENT_CONFIG.segment_time),
          '-hls_list_size',
          '0',
          '-hls_segment_filename',
          segmentPattern,
          '-movflags',
          SEGMENT_CONFIG.movflags,
        ])
        .output(playlistPath);

      // Listen for progress — called periodically while ffmpeg runs
      command.on('progress', (progress) => {
        const percent = Math.round(progress.percent ?? 0);
        // Merge this rendition's progress with the others
        const current = (job.progress as Record<string, number>) ?? {};
        job.updateProgress({ ...current, [preset.name]: percent });
      });

      // ffmpeg finished successfully
      command.on('end', () => {
        this.logger.log(`${preset.name} complete`);
        resolve({ presetName: preset.name, success: true });
      });

      // ffmpeg failed — log the error, resolve with failure
      command.on('error', (err: Error) => {
        this.logger.error(`${preset.name} failed: ${err.message}`);
        resolve({ presetName: preset.name, success: false });
      });

      // Start encoding
      command.run();
    });
  }

  /**
   * Generate the master.m3u8 playlist that links all 4 variant playlists.
   * hls.js reads this file first, then picks the right quality.
   */
  private async generateMasterPlaylist(outputDir: string): Promise<void> {
    const lines = ['#EXTM3U'];
    const bandwidthMap: Record<string, number> = {
      '1080p': 5_000_000,
      '720p': 3_000_000,
      '480p': 1_500_000,
      '360p': 800_000,
    };

    for (const preset of ABR_PRESETS) {
      lines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidthMap[preset.name]},RESOLUTION=${preset.width}x${preset.height}`,
        `${preset.name}.m3u8`,
      );
    }

    // Write the master playlist
    await fs.writeFile(path.join(outputDir, 'master.m3u8'), lines.join('\n'));
  }
}
