import { CarVersion } from "./car-version.js";
import { CID } from "multiformats/cid";
import { CarBlock } from "./block.js";
import type { IBlock } from "./block.js";
import { bases } from "multiformats/basics";
import type { BlockCodec } from "multiformats/codecs/interface";
import type { SyncMultihashHasher } from "multiformats/hashes/interface";
import { BlockStorage } from "./block-storage.js";
import { writerV2, writerV1, asAsyncGenerator } from "./serde/writer.js";
import { UnknownVersionError } from "./serde/unknown-version.error.js";
import type { CodecContainer, HasherContainer } from "./codename-container.js";
import { concatIterable } from "./ancillary/concat-its.js";
import * as dagCbor from "@ipld/dag-cbor";
import { sha256 } from "multihashes-sync/sha2";

export type PutOptions = {
  codec: BlockCodec<number, unknown> | string | number;
  hasher: SyncMultihashHasher | string | number;
  isRoot: boolean;
};

const DEFAULT_PUT_OPTIONS: PutOptions = {
  codec: dagCbor,
  hasher: sha256,
  isRoot: false,
};

export class CAR implements Iterable<Uint8Array>, AsyncIterable<Uint8Array> {
  readonly blocks: BlockStorage;
  readonly codecs: CodecContainer;
  readonly hashers: HasherContainer;

  constructor(
    readonly version: CarVersion,
    readonly roots: Array<CID>,
    blocks: Iterable<IBlock>,
    codecs: CodecContainer,
    hashers: HasherContainer
  ) {
    this.blocks = new BlockStorage();
    for (const block of blocks) {
      this.blocks.put(block);
    }
    this.codecs = codecs;
    this.hashers = hashers;
  }

  put(value: unknown, options: Partial<PutOptions> = {}): CID {
    const effectiveOptions = Object.assign({}, DEFAULT_PUT_OPTIONS, options);
    const codec = this.codecs.get(effectiveOptions.codec);
    const bytes = codec.encode(value);
    const hasher = this.hashers.get(effectiveOptions.hasher);
    const digest = hasher.digest(bytes);
    const cid = CID.createV1(codec.code, digest);
    this.blocks.put(new CarBlock(cid, bytes));
    if (options.isRoot) {
      this.roots.push(cid);
    }
    return cid;
  }

  delete(key: CID): void {
    this.blocks.delete(key);
  }

  get<T extends object = any>(key: CID): T | undefined {
    const codecCode = key.code;
    const codec = this.codecs.get(codecCode) as BlockCodec<number, T>;
    const block = this.blocks.get(key);
    if (!block) return undefined;
    return codec.decode(block.payload);
  }

  asV1() {
    return new CAR(CarVersion.ONE, this.roots, this.blocks, this.codecs, this.hashers);
  }

  asV2() {
    return new CAR(CarVersion.TWO, this.roots, this.blocks, this.codecs, this.hashers);
  }

  get bytes(): Uint8Array {
    return concatIterable(this);
  }

  toString(base: keyof typeof bases = "base64url"): string {
    return bases[base].encode(this.bytes);
  }

  [Symbol.iterator](): Iterator<Uint8Array> {
    switch (this.version) {
      case CarVersion.ONE:
        return writerV1(this.roots, this.blocks);
      case CarVersion.TWO:
        return writerV2(this.roots, this.blocks);
      default:
        throw new UnknownVersionError(this.version);
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
    return asAsyncGenerator(this);
  }
}
