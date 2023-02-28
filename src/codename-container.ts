import type { BlockCodec } from "multiformats/codecs/interface";
import type { SyncMultihashHasher } from "multiformats/hashes/interface";
import { UnknownCodenameError } from "./unknown-codename.error.js";

export interface Codename {
  name: string;
  code: number;
}

export class CodenameContainer<T extends Codename> {
  #byName: Map<string, T> = new Map();
  #byCode: Map<number, T> = new Map();

  constructor(readonly name: string) {}

  add(codec: T): void {
    this.#byCode.set(codec.code, codec);
    this.#byName.set(codec.name, codec);
  }

  has(id: string | number): boolean {
    if (typeof id === "string") {
      return this.#byName.has(id);
    }
    return this.#byCode.has(id);
  }

  get(id: string | number | T): T {
    const byName = typeof id === "string" && this.#byName.get(id);
    if (byName) return byName;
    const byCode = typeof id === "number" && this.#byCode.get(id);
    if (byCode) return byCode;
    const byObject = typeof id === "object" && id;
    if (byObject) return byObject;
    throw new UnknownCodenameError(this.name, id);
  }

  delete(id: string | number): void {
    const found = this.get(id);
    if (found) {
      this.#byName.delete(found.name);
      this.#byCode.delete(found.code);
    }
  }
}

export type CodecContainer = CodenameContainer<BlockCodec<number, any>>;
export type HasherContainer = CodenameContainer<SyncMultihashHasher>;
