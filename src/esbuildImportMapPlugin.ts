import { normalize } from "path";

// Ported from https://github.com/trygve-lie/esbuild-plugin-import-map to Deno
const isBare = (str: string) => {
  if (
    str.startsWith("/") || str.startsWith("./") || str.startsWith("../") ||
    str.substr(0, 7) === "http://" || str.substr(0, 8) === "https://"
  ) {
    return false;
  }
  return true;
};

const isString = (str: string) => typeof str === "string";

const validate = (map: { imports: Record<string, string> }) =>
  Object.keys(map.imports).map((key) => {
    const value = map.imports[key];

    if (isBare(value)) {
      throw Error(
        `Import specifier can NOT be mapped to a bare import statement. Import specifier "${key}" is being wrongly mapped to "${value}"`,
      );
    }

    return { key, value };
  });

const fileReader = (pathname = "") =>
  new Promise((resolve, reject) => {
    const filepath = normalize(pathname);

    Deno.readTextFile(filepath).then((file) => {
      try {
        const obj = JSON.parse(file);
        resolve(validate(obj));
      } catch (error) {
        reject(error);
      }
    }).catch(reject);
  });

const CACHE = new Map();

type ImportMap = { imports: Record<string, string> };

// TODO: Support arrays?
export async function load(importMaps: ImportMap) {
  const maps = Array.isArray(importMaps) ? importMaps : [importMaps];

  const mappings = maps.map((item) => {
    if (isString(item)) {
      return fileReader(item);
    }
    return validate(item);
  });

  await Promise.all(mappings).then((items) => {
    items.forEach((item) => {
      // @ts-ignore Figure out typing for this
      item.forEach((obj) => {
        CACHE.set(obj.key, obj.value);
      });
    });
  });
}

export function clear() {
  CACHE.clear();
}

export function plugin() {
  return {
    name: "importMap",
    setup(build: unknown) {
      // @ts-ignore Figure out typing for this
      build.onResolve({ filter: /.*?/ }, (args: Record<string, string>) => {
        if (CACHE.has(args.path)) {
          return {
            path: CACHE.get(args.path),
            namespace: args.path,
            external: true,
          };
        }
        return {};
      });
    },
  };
}
