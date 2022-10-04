import fsP from "node:fs/promises";

export async function allFixtureFiles(dir: URL): Promise<URL[]> {
  const allFiles = await fsP.readdir(dir);
  const carFiles = allFiles.filter((filename) => filename.match(/\.car$/));
  return carFiles.map((filename) => new URL(`./${filename}`, dir));
}
