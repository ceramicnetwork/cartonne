# Cartonne

In-memory Content Addressable aRchive (CAR) file manipulation.

See also:

- [CAR Specification](https://ipld.io/specs/transport/car/)
- [Go implementation](https://github.com/ipld/go-car)
- [@ipld/car](https://github.com/ipld/js-car) JS packages

## Example

```ts
import { CARFactory } from "cartonne";

const carFactory = new CARFactory(); // Here you can add codecs and hashers

const car = carFactory.build();
// By default encode block as DAG-CBOR, use SHA256 for hashing
// Similar to what you `ipfs.dag.put`
const cid0 = car.put({ hello: "world" });
// Add a block and use it as one of the CAR "roots"
const cid1 = car.put({ foo: new Uint8Array([1, 2, 3]) }, { isRoot: true });
// Return decoded payload
const payload0 = car.get(cid0); //= `{ hello: "world" }`
const payload1 = car.get(cid1); //= `{ foo: new Uint8Array([1, 2, 3]) }`

// And then serialize to bytes...
car.bytes;
// To string as multibase...
car.toString();
// Or to Iterable<Uint8Array> or AsyncIterable<Uint8Array>
import * as fs from "node:fs";
import { pipeline } from "node:stream/promises";
await pipeline(car, fs.createWriteStream("./blah.car"));
```

## Installation

```shell
pnpm add cartonne
```

## Usage

`cartonne` is designed to operate on relatively small CAR files.
Content of a CAR file is fully loaded in memory.

`CARFactory` serves as an entry point. You create an empty CAR file via `CARFactory#build`,
or create it from bytes using `CARFactory#fromBytes`, `CARFactory#fromIterable`, or `CARFactory#fromAsyncIterable`.
All return an instance of `CAR`, which represents a CAR file.

`cartonne` makes it easy to manipulate CAR files by providing access to IPLD data model. You could add IPLD data via
`CAR#put`, and read it via `CAR#get`. By default, we include [dag-cbor](https://ipld.io/specs/codecs/dag-cbor/spec/) codec and [sha256 hasher](https://github.com/multiformats/js-multiformats#multihash-hashers).
You could use additional codecs and hashers by adding it to `CARFactory`, and referencing them by name, code, or directly
when putting data:

```ts
import { CARFactory } from "cartonne";
import * as dagJson from "@ipld/dag-json";
import { sha512 } from "multihashes-sync/sha2";

const carFactory0 = new CARFactory();
carFactory0.codecs.add(dagJson);
carFactory0.hashers.add(sha512);

const car0 = carFactory0.build();
const cid0 = car0.put({ hello: "world" }, { codec: "dag-json", hasher: "sha2-512" });

const carFactory1 = new CARFactory(); // Note: we do not add a codec and a hasher to CARFactory, we use them directly here
const car1 = carFactory1.build();
const cid1 = car1.put({ hello: "world" }, { codec: dagJson, hasher: sha512 });
// Same CID as a result: "baguqee2a7d5wrebdi6rmqkgtrqyodq3bo6gitrqtemxtliymakwswbazbu7ai763747ljp7ycqfv7aqx4xlgiugcx62quo2te45pcgjbg4qjsvq"
console.log(cid1.equals(cid0));
```

You could put an IPLD block directly:

```ts
import { CarBlock } from 'cartonne'
const car = ...
car.blocks.put(new CarBlock(cid, bytes))
```

When you are done manipulating with CAR file, you might want to serialize it. You can encode it as a byte blob via `car.bytes`,
as a [multibase](https://github.com/multiformats/multibase)-encoded string via `car.toString(encoding)` (`base64url` by default). Or, you could stream `CAR`:

```ts
// Byte blob:
car.bytes; // returns `Uint8Array`
car.toString(); // returns base64url multibase string
car.toString("base58btc"); // returns base58btc multibase string
Readable.from(car); // turns CAR into ReadableStream
// Synchronous chunks
for (const chunk of car) {
  // Do something with `Uint8Array` chunk
}
// Asynchronous chunks
for await (const chunk of car) {
  // Do something with `Uint8Array` chunk
}
```

## CARv1 and CARv2

Both CARv1 and CARv2 are supported for reading and writing. Eventually we will add support for CARv2 indexes and characteristics.
For now, written CARv2 just wraps CARv1 payload.

You can convert CAR files to v1 or v2 using corresponding methods:

```ts
const car: CAR = ...
const carV1 = car.asV1()
const carV2 = carV1.asV2()
```

## Roadmap

- Faster encoding/decoding
- Support CAR manipulation on file system
- Read and write CARv2 indexes

## License

Licensed under either of:

- [Apache 2.0](https://opensource.org/licenses/Apache-2.0),
- [MIT](http://opensource.org/licenses/MIT).
