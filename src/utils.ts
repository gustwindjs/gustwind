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

function zipToObject<R>(arr: [unknown, R][]) {
  const ret: Record<string, R> = {};

  arr.forEach(([k, v]) => {
    if (typeof k === "string") {
      ret[k] = v;
    }
  });

  return ret;
}

export { get, isObject, last, zipToObject };
