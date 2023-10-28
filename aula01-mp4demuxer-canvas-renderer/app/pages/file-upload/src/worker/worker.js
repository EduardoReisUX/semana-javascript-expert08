// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
// Workers fazem o processamento numa thread paralela, sem interferir a interface do usuário.

import CanvasRenderer from "./canvasRenderer.js";
import MP4Demuxer from "./mp4Demuxer.js";
import VideoProcessor from "./videoProcessor.js";
import WebMWriter from "./../deps/webm-writer2.js";

// Baixa resolução
const qvgaConstraints = {
  width: 320,
  height: 240,
};

// Resolução média
const vgaConstraints = {
  width: 640,
  height: 480,
};

// HD
const hdConstraints = {
  width: 1280,
  height: 720,
};

const encoderConfig = {
  ...qvgaConstraints,
  bitrate: 10e6, // 1 Mega por segundo

  // Webm
  codec: "vp09.00.10.08",
  pt: 4,
  hardwareAcceleration: "prefer-software",

  // MP4
  // codec: 'avc1.42002A',
  // pt: 1,
  // hardwareAcceleration: 'prefer-hardware',
  // avc: { format: 'annexb' }
};

const webmWriterConfig = {
  codec: "VP9",
  width: encoderConfig.width,
  height: encoderConfig.height,
  bitrate: encoderConfig.bitrate,
};

const mp4Demuxer = new MP4Demuxer();
const videoProcessor = new VideoProcessor({
  mp4Demuxer,
  webMWriter: new WebMWriter(webmWriterConfig),
});

onmessage = async ({ data }) => {
  const renderFrame = CanvasRenderer.getRenderer(data.canvas);
  await videoProcessor.start({
    file: data.file,
    renderFrame,
    encoderConfig,
  });

  self.postMessage({
    status: "done",
  });
};
