function last<O>(array: O[]) {
  return array[array.length - 1];
}

// deno-lint-ignore no-explicit-any
const isObject = (a: any) => !Array.isArray(a) && typeof a === "object";

function get<O = Record<string, unknown>>(
  dataContext: O,
  key?: string,
): unknown {
  if (!key) {
    return;
  }

  let value = dataContext;

  // TODO: What if the lookup fails?
  key.split(".").forEach((k) => {
    if (isObject(value)) {
      // TODO: How to type
      // @ts-ignore Recursive until it finds the root
      value = value[k];
    }
  });

  return value;
}

export { get, isObject, last };
