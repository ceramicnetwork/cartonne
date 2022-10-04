import type { Opaque } from "../ancillary/opaque.js";

export type EOF_MARK = Opaque<-1, "EOF">;
export const EOF_MARK: EOF_MARK = -1 as EOF_MARK;

export function isEOF<A>(input: A | EOF_MARK): input is EOF_MARK {
  return input === EOF_MARK;
}
