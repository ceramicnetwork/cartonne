import { test } from "uvu";
import * as assert from "uvu/assert";
import * as varintes from "varintes";
import { BytesSource } from "../bytes-source.js";
import { readBlock, readBlocks, readHeader, readVarint, readVarintSafe } from "../decoding.js";
import { readFixture } from "../../__tests__/read-fixture.util.js";
import { encode as encodeDagJson } from "@ipld/dag-json";
import { EOF_MARK, isEOF } from "../eof-mark.js";
import { UnexpectedEOFError } from "../unexpected-eof-error.js";
import { concat } from "../../ancillary/concat-its.js";

// 1 byte, 2 bytes, 3 bytes, 4 bytes,..., 7 bytes
const numbers = [118, 16374, 2097142, 268435446, 34359738358, 4398046511094, 562949953421302];

const bytesContainer = (n: number) =>
  concat([varintes.encode(n)[0], Uint8Array.from(Array.from({ length: 100 }).map((_, i) => i))]);

test("readVarint", () => {
  // Just varint byte
  for (const [index, expected] of numbers.entries()) {
    const [bytes] = varintes.encode(expected);
    const br = new BytesSource(bytes);
    const n = readVarint(br);
    assert.equal(br.position, index + 1);
    assert.equal(n, expected);
  }

  // With extra bytes ahead
  for (const [index, expected] of numbers.entries()) {
    const bytes = bytesContainer(expected);
    const br = new BytesSource(bytes);
    const n = readVarint(br);
    assert.equal(br.position, index + 1);
    assert.equal(n, expected);
  }

  const br = new BytesSource(new Uint8Array());
  assert.throws(() => readVarint(br));
});

test("readVarintSafe", () => {
  for (const [index, expected] of numbers.entries()) {
    const [bytes] = varintes.encode(expected);
    const br = new BytesSource(bytes);
    const n = readVarintSafe(br);
    assert.equal(br.position, index + 1);
    assert.equal(n, expected);
  }

  // With extra bytes ahead
  for (const [index, expected] of numbers.entries()) {
    const bytes = bytesContainer(expected);
    const br = new BytesSource(bytes);
    const n = readVarintSafe(br);
    assert.equal(br.position, index + 1);
    assert.equal(n, expected);
  }

  const br = new BytesSource(new Uint8Array());
  assert.equal(readVarintSafe(br), EOF_MARK);
});

// TODO Replace with in-code bytes
const fixtureV1 = readFixture(new URL("../../../fixtures/v1/carv1-basic.car", import.meta.url));
const fixtureV2 = readFixture(new URL("../../../fixtures/v2/carv2-basic.car", import.meta.url));

test("readHeader: v1", async () => {
  const br = new BytesSource(fixtureV1.bytes);
  const headerV1 = readHeader(br);
  assert.equal(headerV1, fixtureV1.expected.header);
});

test("readHeader: v2", async () => {
  const br = new BytesSource(fixtureV2.bytes);
  const headerV2 = readHeader(br);
  assert.equal(encodeDagJson(headerV2), encodeDagJson(fixtureV2.expected.header));
});

test("readBlock", async () => {
  const br = new BytesSource(fixtureV1.bytes);
  readHeader(br);
  for (let i = 0; i < 8; i++) {
    const block = readBlock(br);
    if (isEOF(block)) throw new UnexpectedEOFError();
    assert.equal(new Uint8Array(block.payload), fixtureV1.expected.blocks[i].bytes);
    assert.equal(block.cid.toString(), fixtureV1.expected.blocks[i].cid.toString());
  }
});

test("readBlocks", async () => {
  const br = new BytesSource(fixtureV1.bytes);
  readHeader(br);
  let i = 0;
  for (const block of readBlocks(br)) {
    assert.equal(new Uint8Array(block.payload), fixtureV1.expected.blocks[i].bytes);
    assert.equal(block.cid.toString(), fixtureV1.expected.blocks[i].cid.toString());
    i++;
  }
  assert.equal(i, 8);
});

test.run();
