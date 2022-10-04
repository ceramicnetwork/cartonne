function isIterable<A>(iter: Iterable<A> | Iterator<A>): iter is Iterable<A> {
  return Symbol.iterator in iter;
}

function asIterable<A>(iter: Iterable<A> | Iterator<A>): Iterable<A> {
  return isIterable(iter) ? iter : { [Symbol.iterator]: () => iter };
}

function isAsyncIterable<A>(iter: AsyncIterable<A> | AsyncIterator<A>): iter is AsyncIterable<A> {
  return Symbol.asyncIterator in iter;
}

function asAsyncIterable<A>(iter: AsyncIterable<A> | AsyncIterator<A>): AsyncIterable<A> {
  return isAsyncIterable(iter) ? iter : { [Symbol.asyncIterator]: () => iter };
}

export function concatIterable(iter: Iterable<Uint8Array> | Iterator<Uint8Array>): Uint8Array {
  const chunks = [];
  let length = 0;
  for (const chunk of asIterable(iter)) {
    chunks.push(chunk);
    length += chunk.length;
  }
  return concat(chunks, length);
}

export async function concatAsyncIterable(
  iter: AsyncIterable<Uint8Array> | AsyncIterator<Uint8Array>
): Promise<Uint8Array> {
  const chunks = [];
  let length = 0;
  for await (const chunk of asAsyncIterable(iter)) {
    chunks.push(chunk);
    length += chunk.length;
  }
  return concat(chunks, length);
}

export function concat(arrays: Array<Uint8Array>, length?: number): Uint8Array {
  if (!length) {
    length = arrays.reduce((acc, curr) => acc + curr.length, 0);
  }

  const output = new Uint8Array(length);
  let offset = 0;

  for (const arr of arrays) {
    output.set(arr, offset);
    offset += arr.length;
  }

  return new Uint8Array(output);
}
