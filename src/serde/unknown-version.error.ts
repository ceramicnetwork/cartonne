export class UnknownVersionError extends Error {
  constructor(version: never) {
    super(`Unknown version: ${version}`);
  }
}
