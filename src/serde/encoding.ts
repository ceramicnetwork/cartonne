import { encode as dagCborEncode } from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import { bytes as bytesC } from "multiformats/basics";
import { encode as varintEncode } from "varintes/encode";
import { encodingLength } from "varintes/encoding-length";
import { HeaderV2Characteristics } from "./decoding.js";
import { IBlock } from "../block.js";

const PRAGMA_V2 = bytesC.fromHex("0aa16776657273696f6e02");

export function encodeHeaderV2(
  carv1Size: number,
  characteristics?: HeaderV2Characteristics,
  indexOffset?: bigint
): Uint8Array {
  const result = new Uint8Array(51);
  result.set(PRAGMA_V2, 0);
  const headerView = new DataView(result.buffer, PRAGMA_V2.byteLength, 40);
  // 16 bytes of characteristics
  headerView.setBigUint64(0, characteristics?.[0] || 0n, true);
  headerView.setBigUint64(8, characteristics?.[0] || 0n, true);
  // 8 bytes of data offset
  headerView.setBigUint64(16, BigInt(PRAGMA_V2.length + 40), true);
  // 8 bytes of CARv1 size
  headerView.setBigUint64(24, BigInt(carv1Size), true);
  // Index offset: zero by default
  headerView.setBigUint64(32, indexOffset || 0n, true);
  return result;
}

export function encodeHeaderV1(roots: Array<CID>): Uint8Array {
  const headerBytes = dagCborEncode({ version: 1, roots });
  const varintBytesLength = encodingLength(headerBytes.length);
  const header = new Uint8Array(varintBytesLength + headerBytes.length);
  varintEncode(headerBytes.length, header);
  header.set(headerBytes, varintBytesLength);
  return header;
}

export function encodeBlock(block: IBlock): Uint8Array {
  const result = new Uint8Array(block.encodedLength);
  const [_, len] = varintEncode(block.cid.bytes.length + block.payload.length, result);
  result.set(block.cid.bytes, len);
  result.set(block.payload, len + block.cid.bytes.length);
  return result;
}
