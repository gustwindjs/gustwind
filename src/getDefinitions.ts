import { path } from "../deps.ts";
import { dir, getJson } from "../utils/fs.ts";

async function getDefinitions<T>(directoryPath: string) {
  const componentFiles = await dir(directoryPath, ".json");

  const o = await Promise.all(
    componentFiles.map(({ path }) => getDefinition<T>(path)),
  );

  // @ts-ignore How to type this
  return Object.fromEntries<T>(o);
}

async function getDefinition<T>(p: string): Promise<[string?, T?]> {
  try {
    return [path.basename(p, path.extname(p)), await getJson<T>(p)];
  } catch (error) {
    console.error(`Failed to parse ${p}`, error);
  }

  return [undefined, undefined];
}

export { getDefinition, getDefinitions };
