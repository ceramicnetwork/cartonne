import { readFixture } from "../../__tests__/read-fixture.util.js";
import { test } from "uvu";
import * as assert from "uvu/assert";
import { encodeBlock, encodeHeaderV1, encodeHeaderV2 } from "../encoding.js";
import all from "it-all";
import { CARFactory } from "../../car-factory.js";
import { concat } from "../../ancillary/concat-its.js";

const fixture = readFixture(new URL("../../../fixtures/v1/carv1-basic.car", import.meta.url));
const CAR_FACTORY = new CARFactory();

test("encodeHeader", () => {
  const carFile = CAR_FACTORY.fromBytes(fixture.bytes);
  const header = encodeHeaderV1(carFile.roots);
  const expectedHeader = fixture.bytes.slice(0, header.length);
  assert.equal(new Uint8Array(header), new Uint8Array(expectedHeader));
});

test("encodeHeaderV2_a", async () => {
  const fixture = readFixture(new URL("../../../fixtures/v2/sample-v2-indexless.car", import.meta.url));
  const carFile = CAR_FACTORY.fromBytes(fixture.bytes);
  const blocks = await all(carFile.blocks);
  const sizeV1 = blocks.reduce((acc, block) => block.encodedLength + acc, 0);
  const headerV1Length = encodeHeaderV1(carFile.roots).length;
  const original = new Uint8Array(fixture.bytes.subarray(0, 51));
  const header = encodeHeaderV2(sizeV1 + headerV1Length);
  assert.equal(original, header);
});

test("encode file: v1", () => {
  const carFile = CAR_FACTORY.fromBytes(fixture.bytes);
  const chunksEncoded: Array<Uint8Array> = [];
  chunksEncoded.push(encodeHeaderV1(carFile.roots));
  for (const block of carFile.blocks) {
    chunksEncoded.push(encodeBlock(block));
  }
  const result = concat(chunksEncoded);
  assert.equal(new Uint8Array(result), new Uint8Array(fixture.bytes));
});

test.run();
