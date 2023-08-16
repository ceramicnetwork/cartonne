import type { BytesSource } from "./bytes-source";
import { decode as decodeVarint } from "varintes/decode";
import { CID } from "multiformats/cid";
import * as Digest from "multiformats/hashes/digest";
import { decode as decodeDagCbor } from "@ipld/dag-cbor";
import { EOF_MARK, isEOF } from "./eof-mark.js";
import { InvalidSectionError } from "./invalid-section.error.js";
import { InvalidHeaderError } from "./invalid-header.error.js";
import type { Opaque } from "../ancillary/opaque";
import type { IBlock } from "../block.js";
import { CarVersion } from "../car-version.js";
import { UnknownVersionError } from "./unknown-version.error.js";
import type { HasherContainer } from "../codename-container.js";
import { InvalidBlockError } from "../invalid-block.error.js";

const CIDV0_BYTES = {
  SHA2_256: 0x12,
  LENGTH: 0x20,
  DAG_PB: 0x70,
};

/**
 * Block header.
 */
export type IBlockHeader = {
  /**
   * Block CID.
   */
  cid: CID;
  /**
   * Length of the actual block payload.
   */
  payloadLength: number;
  /**
   * Total block length, if encoded as varint(length)-cid-bytes
   */
  encodedLength: number;
};

export function readVarint(bytesSource: BytesSource): number {
  const bytes = bytesSource.upTo(8);
  const [i, bytesRead] = decodeVarint(bytes);
  bytesSource.move(-(bytes.length - bytesRead));
  return i;
}

export function readVarintSafe(bytesSource: BytesSource): number | EOF_MARK {
  const bytes = bytesSource.upTo(8);
  if (bytes.length === 0) return EOF_MARK;
  const [i, bytesRead] = decodeVarint(bytes);
  bytesSource.move(-(bytes.length - bytesRead));
  return i;
}

function isCID(input: unknown): input is CID {
  return Boolean(CID.asCID(input));
}

export function readMultihash(bytesSource: BytesSource): Digest.MultihashDigest {
  const code = readVarint(bytesSource);
  const size = readVarint(bytesSource);
  const digest = bytesSource.exactly(size);
  return Digest.create(code, digest);
}

export function readCID(bytesSource: BytesSource): CID {
  const first = bytesSource.exactly(2);
  bytesSource.move(-2);
  if (first[0] === CIDV0_BYTES.SHA2_256 && first[1] === CIDV0_BYTES.LENGTH) {
    // cidv0 32-byte sha2-256
    const bytes = bytesSource.exactly(34);
    const multihash = Digest.decode(bytes);
    return CID.create(0, CIDV0_BYTES.DAG_PB, multihash);
  }
  const version = readVarint(bytesSource);
  if (version !== 1) {
    throw new Error(`Unexpected CID version (${version})`);
  }
  const codec = readVarint(bytesSource);
  const multihash = readMultihash(bytesSource);
  return CID.create(version, codec, multihash);
}

export type HeaderV1 = {
  version: 1;
  roots: Array<CID>;
};

export type HeaderV2Characteristics = Opaque<[bigint, bigint], "HeaderV2Characteristics">;

export type HeaderV2 = {
  version: 2;
  roots: Array<CID>;
  characteristics: HeaderV2Characteristics;
  dataOffset: number;
  dataSize: number;
  indexOffset: number;
};

export type CarHeader = HeaderV1 | HeaderV2;

function validateHeaderV1(input: any): input is HeaderV1 {
  return (
    typeof input === "object" &&
    input.version === CarVersion.ONE &&
    Array.isArray(input.roots) &&
    input.roots.every((r: any) => isCID(r))
  );
}

export function readHeader(bytesSource: BytesSource): CarHeader;
export function readHeader(bytesSource: BytesSource, version: CarVersion.TWO): HeaderV2;
export function readHeader(bytesSource: BytesSource, version: CarVersion.ONE): HeaderV1;
export function readHeader(bytesSource: BytesSource, expectedVersion?: CarVersion): CarHeader {
  const length = readVarint(bytesSource);
  const bytes = bytesSource.exactly(length);
  const decoded = decodeDagCbor<any>(bytes);
  const decodedVersion = decoded?.version as CarVersion;
  if (expectedVersion && expectedVersion !== decodedVersion) {
    throw new InvalidHeaderError(`Expected version ${expectedVersion}`);
  }
  switch (decodedVersion) {
    case CarVersion.ONE:
      if (validateHeaderV1(decoded)) {
        return decoded;
      } else {
        throw new InvalidHeaderError(`Invalid CARv1 Header`);
      }
    case CarVersion.TWO:
      const bytes = bytesSource.exactly(40);
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const headerV2pre = {
        version: CarVersion.TWO,
        characteristics: [dataView.getBigUint64(0, true), dataView.getBigUint64(8, true)] as HeaderV2Characteristics,
        dataOffset: Number(dataView.getBigUint64(16, true)),
        dataSize: Number(dataView.getBigUint64(24, true)),
        indexOffset: Number(dataView.getBigUint64(32, true)),
      };
      bytesSource.exactly(headerV2pre.dataOffset - bytesSource.position);
      const v1 = readHeader(bytesSource, 1);
      return Object.assign(headerV2pre, { roots: v1.roots });
    default:
      throw new UnknownVersionError(decodedVersion);
  }
}

export function readBlockHeader(bytesSource: BytesSource): IBlockHeader | EOF_MARK {
  const start = bytesSource.position;
  const length = readVarintSafe(bytesSource);
  if (isEOF(length)) return EOF_MARK;
  if (length === 0) {
    throw new InvalidSectionError("zero length");
  }
  const reportedLength = length + bytesSource.position - start;
  const cid = readCID(bytesSource);
  const bytesLength = reportedLength - (bytesSource.position - start);
  return {
    cid: cid,
    encodedLength: reportedLength,
    payloadLength: bytesLength,
  };
}

function verifyBlock(hashers: HasherContainer, cid: CID, bytes: Uint8Array) {
  const hasherCode = cid.multihash.code;
  const hasher = hashers.get(hasherCode);
  const digestCalculated = hasher.digest(bytes).digest;
  const digestFromCID = cid.multihash.digest;
  if (digestCalculated.byteLength !== digestFromCID.byteLength) {
    throw new InvalidBlockError(cid);
  }
  for (let x = 0; x <= digestCalculated.byteLength; x++) {
    if (digestCalculated[x] !== digestFromCID[x]) {
      throw new InvalidBlockError(cid);
    }
  }
}

export function readBlock(
  bytesSource: BytesSource,
  hashers: HasherContainer,
  verify: boolean = false
): IBlock | EOF_MARK {
  const header = readBlockHeader(bytesSource);
  if (isEOF(header)) return EOF_MARK;
  const cid = header.cid;
  const bytes = bytesSource.exactly(header.payloadLength);
  if (verify) {
    verifyBlock(hashers, cid, bytes);
  }
  return {
    payload: bytes,
    cid: cid,
    encodedLength: header.encodedLength,
  };
}

export function* readBlocks(
  bytesSource: BytesSource,
  hashers: HasherContainer,
  verify: boolean = false
): Generator<IBlock> {
  while (true) {
    const block = readBlock(bytesSource, hashers, verify);
    if (isEOF(block)) return;
    yield block;
  }
}
