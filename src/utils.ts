import { basename, extname, join } from "path";
import type { Component } from "../types.ts";

function getJson<R>(filePath: string): Promise<R> {
  return Deno.readTextFile(filePath).then((d) => JSON.parse(d));
}

function getJsonSync<R>(filePath: string): R {
  return JSON.parse(Deno.readTextFileSync(filePath));
}

async function getComponents(directoryPath: string) {
  const componentFiles = await dir(directoryPath);

  const o = await Promise.all(
    await componentFiles.map(async (
      { path },
    ) => [basename(path, extname(path)), await getJson<Component>(path)]),
  );

  // @ts-ignore How to type this
  return zipToObject<Component>(o);
}

function last<O>(array: O[]) {
  return array[array.length - 1];
}

// deno-lint-ignore no-explicit-any
const isObject = (a: any) => typeof a === "object";

function get<O = Record<string, unknown>>(dataContext: O, key: string): string {
  let value = dataContext;

  // TODO: What if the lookup fails?
  key.split(".").forEach((k) => {
    if (isObject(value)) {
      // TODO: How to type
      // @ts-ignore Recursive until it finds the root
      value = value[k];
    }
  });

  // TODO: How to type
  return value as unknown as string;
}

async function dir(p: string) {
  const ret = [];

  for await (const { name } of Deno.readDir(p)) {
    ret.push({ path: join(p, name), name });
  }

  return ret;
}

function dirSync(p: string) {
  const ret = [];

  for (const { name } of Deno.readDirSync(p)) {
    ret.push({ path: join(p, name), name });
  }

  return ret;
}

function zipToObject<R>(arr: [string, R][]) {
  const ret: Record<string, R> = {};

  arr.forEach(([k, v]) => {
    ret[k] = v;
  });

  return ret;
}

async function watch(
  directory: string,
  extension: string,
  handler: (path: string) => void,
) {
  const watcher = Deno.watchFs(directory);

  for await (const event of watcher) {
    event.paths.forEach((p) => p.endsWith(extension) && handler(p));
  }
}

export {
  dir,
  dirSync,
  get,
  getComponents,
  getJson,
  getJsonSync,
  isObject,
  last,
  watch,
  zipToObject,
};
