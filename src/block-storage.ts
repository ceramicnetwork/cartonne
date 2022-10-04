import type { CID } from "multiformats/cid";
import type { IBlock } from "./block.js";

// TODO: Node.inspect

/**
 * Container for all the blocks.
 * Tracks byte length of blocks if encoded as CARv1 payload.
 */
export class BlockStorage implements Iterable<IBlock>, AsyncIterable<IBlock> {
  #blocks: Map<string, IBlock> = new Map();
  #encodedLength: number = 0;

  /**
   * Total byte length of blocks encoded as per CARv1.
   */
  get encodedLength(): number {
    return this.#encodedLength;
  }

  /**
   * Add block to storage.
   */
  put(block: IBlock): void {
    if (this.has(block.cid)) return;
    this.#blocks.set(block.cid.toV1().toString(), block);
    this.#encodedLength += block.encodedLength;
  }

  /**
   * Return true if we store a block with `key` CID.
   */
  has(key: CID): boolean {
    return this.#blocks.has(key.toV1().toString());
  }

  /**
   * Return block if found.
   */
  get(key: CID): IBlock | undefined {
    return this.#blocks.get(key.toV1().toString());
  }

  /**
   * Do not store this block anymore.
   */
  delete(key: CID): void {
    const found = this.get(key);
    if (found) {
      this.#encodedLength -= found.encodedLength;
      this.#blocks.delete(key.toV1().toString());
    }
  }

  [Symbol.iterator](): Iterator<IBlock> {
    return this.#blocks.values();
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<IBlock> {
    for (const block of this.#blocks.values()) {
      yield block;
    }
  }

  *cids(): Iterable<CID> {
    for (const block of this) {
      yield block.cid;
    }
  }
}
