export const TRANSCODE_QUEUE_NAME = 'transcode';

// Where to write HLS output and read uploads from
export const HLS_OUTPUT_DIR = 'storage/hls';
export const UPLOADS_DIR = 'storage/uploads';

// ffmpeg segment settings
export const SEGMENT_CONFIG = {
  segment_time: 4, // each .ts segment is 4 seconds
  preset: 'veryfast', // encoding speed/quality tradeoff
  movflags: '+faststart', // move moov atom to start for streaming
};

// ABR presets — bitrate strings for fluent-ffmpeg
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
