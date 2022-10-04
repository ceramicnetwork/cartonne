/**
 * Reached unexpected end of data.
 */
export class UnexpectedEOFError extends Error {
  constructor() {
    super(`Unexpected end of data`);
  }
}
