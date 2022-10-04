import { UnexpectedEOFError } from "./unexpected-eof-error.js";

/**
 * Read raw bytes (Uint8Array) as a tape.
 */
export class BytesSource {
  #position = 0;

  constructor(private readonly bytes: Uint8Array) {}

  /**
   * Current position of the reader.
   */
  get position(): number {
    return this.#position;
  }

  /**
   * Read up to +length+ bytes forward. Might return empty Uint8Array if reached end of data.
   */
  upTo(length: number): Uint8Array {
    const result = this.bytes.subarray(
      this.#position,
      this.#position + Math.min(length, this.bytes.length - this.#position)
    );
    this.#position += result.length;
    return result;
  }

  /**
   * Move reader position relative to the current position.
   * `delta` can be negative.
   */
  move(delta: number): void {
    this.#position += delta;
  }

  /**
   * Read exactly +length+ bytes forward. Return an error if reached end of data.
   */
  exactly(length: number): Uint8Array {
    if (this.#position + length > this.bytes.length) {
      throw new UnexpectedEOFError();
    }
    const result = this.bytes.subarray(this.#position, this.#position + length);
    this.#position += length;
    return result;
  }
}
