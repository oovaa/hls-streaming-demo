export const TRANSCODE_QUEUE_NAME = 'transcode';

export const ABR_PRESETS = [
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    videoBitrate: 5_000_000, // 5 Mbps
    audioBitrate: 128_000, // 128 Kbps
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    videoBitrate: 3_000_000,
    audioBitrate: 96_000,
  },
  {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: 1_500_000,
    audioBitrate: 64_000,
  },
  {
    name: '360p',
    width: 640,
    height: 360,
    videoBitrate: 800_000,
    audioBitrate: 64_000,
  },
];
