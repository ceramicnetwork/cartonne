import { test } from "uvu";
import * as assert from "uvu/assert";
import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import all from "it-all";
import { allFixtureFiles } from "./all-fixture-files.util.js";
import { readFixture } from "./read-fixture.util.js";
import { CARFactory } from "../car-factory.js";
import { sha256 } from "multihashes-sync/sha2";
import { concat } from "../ancillary/concat-its.js";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import type { SyncMultihashHasher } from "multiformats/hashes/interface";

const V1_FIXTURES_DIR = new URL("../../fixtures/v1/", import.meta.url);
const V2_FIXTURES_DIR = new URL("../../fixtures/v2/", import.meta.url);
const CAR_FACTORY = new CARFactory();
CAR_FACTORY.hashers.add(blake2b256 as SyncMultihashHasher);

const RANDOM_PAYLOADS = Array.from({ length: 10 }).map(() => {
  return {
    hello: Math.random(),
  };
});

test("get-put with codec and hasher", async () => {
  const car = CAR_FACTORY.build();
  const roots: CID[] = [];
  const cids: CID[] = [];
  let n = 0;
  for (const payload of RANDOM_PAYLOADS) {
    const isRoot = n % 3 === 0;
    const cid = car.put(payload, { codec: dagCbor, isRoot: isRoot, hasher: sha256 });
    if (isRoot) roots.push(cid);
    cids.push(cid);
    const returned = car.get(cid);
    assert.equal(returned, payload);
    n++;
  }
  let chunks = [];
  for (const chunk of car) {
    chunks.push(chunk);
  }
  const bytes = concat(chunks);
  const read = CAR_FACTORY.fromBytes(bytes);
  assert.equal(read.roots.join(","), roots.join(","));
  const readCIDs = await all(read.blocks.cids());
  assert.equal(readCIDs.join(","), cids.join(","));
});

test("put with codec and hasher by name", async () => {
  // Same CID if codec and hasher are passed directly or by name
  const car = CAR_FACTORY.build();
  for (const payload of RANDOM_PAYLOADS) {
    const cid0 = car.put(payload, { codec: "dag-cbor", isRoot: false, hasher: "sha2-256" });
    const cid1 = car.put(payload, { codec: dagCbor, isRoot: false, hasher: sha256 });
    assert.equal(cid0, cid1);
  }
});

test("put with default codec and hasher", async () => {
  // Same CID if codec and hasher are passed directly or by name
  const car = CAR_FACTORY.build();
  for (const payload of RANDOM_PAYLOADS) {
    const cid0 = car.put(payload, { isRoot: false });
    const cid1 = car.put(payload, { codec: dagCbor, isRoot: false, hasher: sha256 });
    assert.equal(cid0, cid1);
  }
});

test("put with defaults", async () => {
  const car = CAR_FACTORY.build();
  for (const payload of RANDOM_PAYLOADS) {
    const cid0 = car.put(payload);
    const cid1 = car.put(payload, { codec: dagCbor, isRoot: false, hasher: sha256 });
    assert.equal(cid0, cid1);
  }
  assert.equal(car.roots, []);
});

test("v1: read fixtures", async () => {
  const carFixtureFilepaths = await allFixtureFiles(V1_FIXTURES_DIR);
  for (const filepath of carFixtureFilepaths) {
    const fixture = readFixture(filepath);
    if (fixture.expected.error) {
      assert.throws(() => CAR_FACTORY.fromBytes(fixture.bytes), fixture.expected.error);
      continue;
    }
    const carFile = CAR_FACTORY.fromBytes(fixture.bytes);
    assert.equal(carFile.version, fixture.expected.header.version);
    assert.equal(carFile.roots, fixture.expected.header.roots);
    const readBlocks = await all(carFile.blocks);
    assert.equal(readBlocks.length, fixture.expected.blocks.length);
    readBlocks.forEach((block, index) => {
      assert.equal(block.cid.toString(), fixture.expected.blocks[index].cid.toString());
      assert.equal(new Uint8Array(block.payload), fixture.expected.blocks[index].bytes);
    });
  }
});

test("v1: write", async () => {
  const carFixtureFilepaths = await allFixtureFiles(V1_FIXTURES_DIR);
  for (const filepath of carFixtureFilepaths) {
    const fixture = readFixture(filepath);
    if (fixture.expected.error) {
      assert.throws(() => CAR_FACTORY.fromBytes(fixture.bytes), fixture.expected.error);
      continue;
    }
    const carFile = CAR_FACTORY.fromBytes(fixture.bytes);
    const recoveredBytes = carFile.bytes;
    assert.equal(new Uint8Array(recoveredBytes), new Uint8Array(fixture.bytes));
    const recovered = CAR_FACTORY.fromBytes(recoveredBytes);
    assert.equal(recovered.version, fixture.expected.header.version);
    assert.equal(recovered.roots, fixture.expected.header.roots);
    const readBlocks = await all(recovered.blocks);
    assert.equal(readBlocks.length, fixture.expected.blocks.length);
    readBlocks.forEach((block, index) => {
      assert.equal(block.cid.toString(), fixture.expected.blocks[index].cid.toString());
      assert.equal(new Uint8Array(block.payload), fixture.expected.blocks[index].bytes);
    });
  }
});

test("v2: read fixtures", async () => {
  const carFixtureFilepaths = await allFixtureFiles(V2_FIXTURES_DIR);
  for (const filepath of carFixtureFilepaths) {
    const fixture = readFixture(filepath);
    if (fixture.expected.error) {
      assert.throws(() => CAR_FACTORY.fromBytes(fixture.bytes), fixture.expected.error);
      continue;
    }
    const carFile = CAR_FACTORY.fromBytes(fixture.bytes);
    assert.equal(carFile.version, fixture.expected.header.version, `Version mismatch`);
    assert.equal(carFile.roots, fixture.expected.header.roots, `Roots mismatch`);
    const readBlocks = await all(carFile.blocks);
    assert.equal(readBlocks.length, fixture.expected.blocks.length);
    readBlocks.forEach((block, index) => {
      assert.equal(block.cid.toString(), fixture.expected.blocks[index].cid.toString());
      assert.equal(new Uint8Array(block.payload), fixture.expected.blocks[index].bytes);
    });
  }
});

test("v2: write", async () => {
  const carFixtureFilepaths = await allFixtureFiles(V2_FIXTURES_DIR);
  for (const filepath of carFixtureFilepaths) {
    const fixture = readFixture(filepath);
    if (fixture.expected.error) {
      assert.throws(() => CAR_FACTORY.fromBytes(fixture.bytes), fixture.expected.error);
      continue;
    }
    const carFile = CAR_FACTORY.fromBytes(fixture.bytes);
    const recovered = CAR_FACTORY.fromBytes(carFile.bytes);
    assert.equal(recovered.version, fixture.expected.header.version);
    assert.equal(recovered.roots, fixture.expected.header.roots);
    const readBlocks = await all(recovered.blocks);
    assert.equal(readBlocks.length, fixture.expected.blocks.length);
    readBlocks.forEach((block, index) => {
      assert.equal(block.cid.toString(), fixture.expected.blocks[index].cid.toString());
      assert.equal(new Uint8Array(block.payload), fixture.expected.blocks[index].bytes);
    });
  }
});

test.run();
