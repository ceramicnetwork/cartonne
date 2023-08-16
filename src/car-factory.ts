import * as dagCbor from "@ipld/dag-cbor";
import { CAR } from "./car.js";
import { concatAsyncIterable, concatIterable } from "./ancillary/concat-its.js";
import { CodecContainer, CodenameContainer, HasherContainer } from "./codename-container.js";
import { sha256, sha512 } from "multihashes-sync/sha2";
import { CarVersion } from "./car-version.js";
import { BytesSource } from "./serde/bytes-source.js";
import { readBlocks, readHeader } from "./serde/decoding.js";
import { identity } from "multiformats/hashes/identity";

type FromOpts = {
  verify: boolean;
};

export class CARFactory {
  #codecs: CodecContainer;
  #hashers: HasherContainer;

  constructor() {
    this.#codecs = new CodenameContainer("codecs");
    this.#codecs.add(dagCbor);
    this.#hashers = new CodenameContainer("hashers");
    this.#hashers.add(sha256);
    this.#hashers.add(sha512);
    this.#hashers.add(identity);
  }

  get codecs(): CodecContainer {
    return this.#codecs;
  }

  get hashers(): HasherContainer {
    return this.#hashers;
  }

  build(version: CarVersion = CarVersion.ONE): CAR {
    return new CAR(version, [], [], this.#codecs, this.#hashers);
  }

  fromBytes(bytes: Uint8Array, opts: Partial<FromOpts> = {}): CAR {
    let bytesSource = new BytesSource(bytes);
    const header = readHeader(bytesSource);
    if (header.version === CarVersion.TWO) {
      bytesSource = new BytesSource(bytes.subarray(bytesSource.position, header.dataSize + header.dataOffset));
    }
    return new CAR(
      header.version,
      header.roots,
      readBlocks(bytesSource, this.#hashers, opts.verify),
      this.#codecs,
      this.#hashers
    );
  }

  fromIterable(iter: Iterable<Uint8Array>, opts: Partial<FromOpts> = {}): CAR {
    return this.fromBytes(concatIterable(iter), opts);
  }

  async fromAsyncIterable(iter: AsyncIterable<Uint8Array>, opts: Partial<FromOpts> = {}): Promise<CAR> {
    const bytes = await concatAsyncIterable(iter);
    return this.fromBytes(bytes, opts);
  }
}
