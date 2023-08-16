import type { CID } from "multiformats/cid";

export class InvalidBlockError extends Error {
  constructor(cid: CID) {
    super(`Invalid block for ${cid}`);
  }
}
