import { test } from "uvu";
import * as assert from "uvu/assert";
import { CID } from "multiformats/cid";
import { randomBytes } from "@stablelib/random";
import { CarBlock, IBlock } from "../block.js";
import { BlockStorage } from "../block-storage.js";
import all from "it-all";

function randomCID() {
  return CID.create(1, 0x12, {
    code: 0x11,
    digest: randomBytes(32),
    bytes: randomBytes(32),
    size: 32,
  });
}

function randomBlock(): CarBlock {
  const payloadLength = Math.floor(Math.random() * 512);
  return new CarBlock(randomCID(), randomBytes(payloadLength));
}

test("put-get", () => {
  const storage = new BlockStorage();
  assert.equal(storage.encodedLength, 0);
  const block0 = randomBlock();
  storage.put(block0);
  const block1 = randomBlock();
  storage.put(block1);
  assert.equal(storage.encodedLength, block0.encodedLength + block1.encodedLength);
  assert.equal(storage.get(block0.cid), block0);
  assert.equal(storage.get(block1.cid), block1);
});

test("iterable", async () => {
  const storage = new BlockStorage();
  assert.equal(storage.encodedLength, 0);
  const block0 = randomBlock();
  storage.put(block0);
  const block1 = randomBlock();
  storage.put(block1);
  const blocks = await all(storage);
  assert.equal(blocks.length, 2);
  const find = (ba: IBlock) => blocks.find((b) => ba.cid.equals(b.cid));
  assert.equal(find(block0), block0);
  assert.equal(find(block1), block1);
});

test("cids", async () => {
  const storage = new BlockStorage();
  assert.equal(storage.encodedLength, 0);
  const block0 = randomBlock();
  storage.put(block0);
  const block1 = randomBlock();
  storage.put(block1);
  const cids = await all(storage.cids());
  assert.equal(cids.length, 2);
  const find = (ba: CID) => cids.find((b) => ba.equals(b));
  assert.equal(find(block0.cid), block0.cid);
  assert.equal(find(block1.cid), block1.cid);
});

test("has", () => {
  const storage = new BlockStorage();
  assert.equal(storage.encodedLength, 0);
  const block0 = randomBlock();
  storage.put(block0);
  const block1 = randomBlock();
  storage.put(block1);
  assert.ok(storage.has(block0.cid));
  assert.ok(storage.has(block1.cid));
});

test("delete", () => {
  const storage = new BlockStorage();
  assert.equal(storage.encodedLength, 0);
  const block0 = randomBlock();
  storage.put(block0);
  const block1 = randomBlock();
  storage.put(block1);
  storage.delete(block0.cid);
  storage.delete(block1.cid);
  assert.not.ok(storage.has(block0.cid));
  assert.not.ok(storage.has(block1.cid));
  assert.equal(storage.encodedLength, 0);
});

test('size', () => {
  const storage = new BlockStorage()
  assert.equal(storage.size, 0)
  storage.put(randomBlock())
  assert.equal(storage.size, 1)
  storage.put(randomBlock())
  assert.equal(storage.size, 2)
})

test.run();
