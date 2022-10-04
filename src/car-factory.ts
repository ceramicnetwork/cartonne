import * as dagCbor from "@ipld/dag-cbor";
import { CAR } from "./car.js";
import { concatAsyncIterable, concatIterable } from "./ancillary/concat-its.js";
import { CodecContainer, CodenameContainer, HasherContainer } from "./codename-container.js";
import { sha256, sha512 } from "multihashes-sync/sha2";
import { CarVersion } from "./car-version.js";
import { BytesSource } from "./serde/bytes-source.js";
import { readBlocks, readHeader } from "./serde/decoding.js";

export class CARFactory {
  #codecs: CodecContainer;
  #hashers: HasherContainer;

  constructor() {
    this.#codecs = new CodenameContainer("codecs");
    this.#codecs.add(dagCbor);
    this.#hashers = new CodenameContainer("hashers");
    this.#hashers.add(sha256);
    this.#hashers.add(sha512);
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

  fromBytes(bytes: Uint8Array): CAR {
    let bytesSource = new BytesSource(bytes);
    const header = readHeader(bytesSource);
    if (header.version === CarVersion.TWO) {
      bytesSource = new BytesSource(bytes.subarray(bytesSource.position, header.dataSize + header.dataOffset));
    }
    return new CAR(header.version, header.roots, readBlocks(bytesSource), this.#codecs, this.#hashers);
  }

  fromIterable(iter: Iterable<Uint8Array>): CAR {
    return this.fromBytes(concatIterable(iter));
  }

  fromAsyncIterable(iter: AsyncIterable<Uint8Array>): Promise<CAR> {
    return concatAsyncIterable(iter).then((bytes) => this.fromBytes(bytes));
  }
}
