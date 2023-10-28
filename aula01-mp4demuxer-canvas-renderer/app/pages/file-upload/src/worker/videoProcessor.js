export default class VideoProcessor {
  #mp4Demuxer;
  #webMWriter;

  /**
   *
   * @param {object} options
   * @param {import('./mp4Demuxer.js').default} options.mp4Demuxer
   * @param {import('./../deps/webm-writer2.js').default} options.webMWriter
   */
  constructor({ mp4Demuxe, webMWriter }) {
    this.#mp4Demuxer = mp4Demuxer;
    this.#webMWriter = webMWriter;
  }

  /** @returns {ReadableStream} */
  mp4Decoder(stream) {
    return new ReadableStream({
      start: async (controller) => {
        const decoder = new VideoDecoder({
          /** @param {VideoFrame} frame  */
          output(frame) {
            controller.enqueue(frame);
          },
          error(e) {
            console.error("error at mp4Decoder", e);
            controller.error(e);
          },
        });

        return this.#mp4Demuxer.run(stream, {
          async onConfig(config) {
            const { supported } = await VideoDecoder.isConfigSupported(config);

            if (!supported) {
              console.error(
                "mp4Muxer VideoDecoder config not supported",
                config
              );
              controller.close();
              return;
            }

            decoder.configure(config);
          },
          /** @param {EncodedVideoChunk} chunk  */
          onChunk(chunk) {
            decoder.decode(chunk);
          },
        });
        // .then(() => {
        //   setTimeout(() => {
        //     controller.close();
        //   }, 1000);
        // });
      },
    });
  }

  encode144p(encoderConfig) {
    let _encoder;

    const readable = new ReadableStream({
      start: async (controller) => {
        const { supported } = await VideoEncoder.isConfigSupported(
          encoderConfig
        );

        if (!supported) {
          console.error(
            "encode144p VideoEncoder config not supported",
            encoderConfig
          );
          controller.error("encode144p VideoEncoder config not supported");
          controller.close();
          return;
        }

        _encoder = new VideoEncoder({
          /**
           *
           * @param {EncodedVideoChunk} frame
           * @param {EncodedVideoChunkMetadata} config
           */

          output: (frame, config) => {
            if (config.decoderConfig) {
              const decoderConfig = {
                type: "config",
                config: config.decoderConfig,
              };
              controller.enqueue(decoderConfig);
            }

            controller.enqueue(frame);
          },

          error: (err) => {
            console.error("VideoEncoder 144p", err);
            controller.error(err);
          },
        });

        await _encoder.configure(encoderConfig);
      },
    });

    const writable = new WritableStream({
      async write(frame) {
        _encoder.encode(frame);
        frame.close();
      },
    });

    // Duplex stream
    return {
      readable,
      writable,
    };
  }

  renderDecodedFramesAndGetEncodedChunks(renderFrame) {
    let _decoder;

    return new TransformStream({
      start: (controller) => {
        _decoder = new VideoDecoder({
          output(frame) {
            renderFrame(frame);
          },
          error(e) {
            console.error("error at renderFrames", e);
            controller.error(e);
          },
        });
      },

      /**
       *
       * @param {EncodedVideoChunk} encodedChunk
       * @param {TransformStreamDefaultController} controleer
       */
      async transform(encodedChunk, controleer) {
        if (encodedChunk.type === "config") {
          await _decoder.configure(encodedChunk.config);
          return;
        }

        _decoder.decode(encodedChunk);

        // need the encoded version to use webM
        controleer.enqueue(encodedChunk);
      },
    });
  }

  transformIntoWebM() {
    const writable = new WritableStream({
      write: (chunk) => {
        this.#webMWriter.addFrame(chunk);
      },
      close() {
        debugger;
      },
    });

    return {
      readable: this.#webMWriter.getStream(),
      writable,
    };
  }

  async start({ file, encoderConfig, renderFrame }) {
    const stream = file.stream();
    const fileName = file.name.split("/").pop().replace(".mp4", "");

    await this.mp4Decoder(stream)
      .pipeThrough(this.encode144p(encoderConfig)) // Readable e Transformable stream
      .pipeThrough(this.renderDecodedFramesAndGetEncodedChunks(renderFrame))
      .pipeThrough(this.transformIntoWebM())
      .pipeTo(
        // readable stream
        new WritableStream({
          write(frame) {
            debugger;
            // renderFrame(frame);
          },
        })
      );
  }
}
