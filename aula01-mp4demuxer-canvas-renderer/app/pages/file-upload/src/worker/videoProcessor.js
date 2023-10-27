export default class VideoProcessor {
  async start({ file, encoderConfig }) {
    const stream = file.stream();
    const fileName = file.name.split("/").pop().replace(".mp4", "");
    debugger;
  }
}
