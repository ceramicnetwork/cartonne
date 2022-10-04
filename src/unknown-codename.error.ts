export class UnknownCodenameError extends Error {
  constructor(containerName: string, id: string | number) {
    super(`Unknown codename for ${containerName}: ${id}`);
  }
}
