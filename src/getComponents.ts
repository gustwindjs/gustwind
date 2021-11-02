import { basename, extname } from "path";
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

async function getComponent(path: string): Promise<[string?, Component?]> {
  try {
    return [basename(path, extname(path)), await getJson<Component>(path)];
  } catch (error) {
    console.error(`Failed to parse ${path}`, error);
  }

  return [undefined, undefined];
}

export { getComponent, getComponents };
