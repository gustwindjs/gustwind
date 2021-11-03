import { path } from "../deps.ts";
import { dir, getJson } from "../utils/fs.ts";
import type { Component } from "../types.ts";

async function getComponents(directoryPath: string) {
  const componentFiles = await dir(directoryPath);

  const o = await Promise.all(
    componentFiles.map(({ path }) => getComponent(path)),
  );

  // @ts-ignore How to type this
  return Object.fromEntries<Component>(o);
}

async function getComponent(p: string): Promise<[string?, Component?]> {
  try {
    return [path.basename(p, path.extname(p)), await getJson<Component>(p)];
  } catch (error) {
    console.error(`Failed to parse ${p}`, error);
  }

  return [undefined, undefined];
}

export { getComponent, getComponents };
