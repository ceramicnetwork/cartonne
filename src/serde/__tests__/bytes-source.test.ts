import { test } from "uvu";
import * as assert from "uvu/assert";
import { randomBytes } from "@stablelib/random";
import { BytesSource } from "../bytes-source.js";
import { UnexpectedEOFError } from "../unexpected-eof-error.js";

const bytes = randomBytes(32);

test("exactly", () => {
  const bytesSource = new BytesSource(bytes);
  const first30 = bytesSource.exactly(30);
  assert.equal(first30, bytes.subarray(0, 30));
  assert.equal(bytesSource.position, 30);
  assert.throws(() => bytesSource.exactly(30), new UnexpectedEOFError());
  assert.equal(bytesSource.position, 30);
  const last2 = bytesSource.exactly(2);
  assert.equal(bytesSource.position, 32);
  assert.equal(last2, bytes.subarray(30, 32));
});

test("upTo", () => {
  const bytesSource = new BytesSource(bytes);
  bytesSource.exactly(20);
  const read = bytesSource.upTo(10);
  assert.equal(read, bytes.subarray(20, 30));
  assert.equal(bytesSource.position, 30);
  const read2 = bytesSource.upTo(10);
  assert.equal(read2, bytes.subarray(30, 32));
  assert.equal(bytesSource.position, 32);
});

test("move", () => {
  const bytesSource = new BytesSource(bytes);
  bytesSource.exactly(10);
  const read = bytesSource.exactly(20);
  assert.equal(bytesSource.position, 30);
  assert.equal(read, bytes.subarray(10, 30));
  bytesSource.move(-7);
  assert.equal(bytesSource.position, 23);
  bytesSource.move(+7);
  assert.equal(bytesSource.position, 30);
});

test.run();
