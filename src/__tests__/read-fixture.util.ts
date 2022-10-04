import fs from "node:fs";
import { decode as decodeDagJson } from "@ipld/dag-json";

export function readFixture(carFilepath: URL): {
  bytes: Uint8Array;
  expected: any;
} {
  const carBytes = fs.readFileSync(carFilepath);
  const fixtureFilepath = new URL(carFilepath);
  fixtureFilepath.pathname = `${carFilepath.pathname}.json`;
  const fixtureBytes = fs.readFileSync(fixtureFilepath);
  const carFixture = decodeDagJson<any>(fixtureBytes);
  return { bytes: carBytes, expected: carFixture };
}
