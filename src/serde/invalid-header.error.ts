/**
 * CAR header is invalid
 */
export class InvalidHeaderError extends Error {
  constructor(message: string) {
    super(`Invalid CAR header: ${message}`);
  }
}
