import { path } from "../server-deps.ts";
import { getJson } from "../utilities/fs.ts";

async function getDefinitions<T>(
  componentFiles: { path: string; name: string }[],
) {
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
