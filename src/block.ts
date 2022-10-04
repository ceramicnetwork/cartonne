import type { CID } from "multiformats/cid";
import { encodingLength } from "varintes/encoding-length";

/**
 * CAR block.
 */
export type IBlock = {
  cid: CID;
  payload: Uint8Array;
  encodedLength: number;
};

export class CarBlock implements IBlock {
  #encodedLength: number | undefined = undefined;

  constructor(readonly cid: CID, readonly payload: Uint8Array) {}

  get encodedLength(): number {
    if (!this.#encodedLength) {
      const blockLength = this.cid.bytes.length + this.payload.length;
      this.#encodedLength = encodingLength(blockLength) + blockLength;
    }
    return this.#encodedLength;
  }
}
