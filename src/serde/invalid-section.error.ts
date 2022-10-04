/**
 * Block length is stated to be zero.
 */
export class InvalidSectionError extends Error {
  constructor(reason: string) {
    super(`Invalid CAR section: ${reason}`);
  }
}
