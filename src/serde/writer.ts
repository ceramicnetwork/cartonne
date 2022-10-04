import type { CID } from "multiformats/cid";
import type { IBlock } from "../block.js";
import { encodeBlock, encodeHeaderV1, encodeHeaderV2 } from "./encoding.js";

export function* writerV1(roots: Array<CID>, blocks: Iterable<IBlock>): Generator<Uint8Array> {
  yield encodeHeaderV1(roots);
  for (const block of blocks) {
    yield encodeBlock(block);
  }
}

export function* writerV2(roots: Array<CID>, blocks: Iterable<IBlock> & { encodedLength: number }) {
  const headerV1 = encodeHeaderV1(roots);
  yield encodeHeaderV2(blocks.encodedLength + headerV1.length);
  yield headerV1;
  for (const block of blocks) {
    yield encodeBlock(block);
  }
}

export function iterableBytes(generator: Generator<Uint8Array>): Iterable<Uint8Array> & AsyncIterable<Uint8Array> {
  return {
    [Symbol.iterator]: () => {
      return generator;
    },
    [Symbol.asyncIterator]: () => {
      return asAsyncGenerator(generator);
    },
  };
}

export async function* asAsyncGenerator(sync: Iterable<Uint8Array>): AsyncGenerator<Uint8Array> {
  for (const chunk of sync) {
    yield chunk;
  }
}
