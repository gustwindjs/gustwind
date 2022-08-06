function last<O>(array: O[]) {
  return array[array.length - 1];
}

function isUndefined(str?: unknown) {
  return typeof str == "undefined";
}

// deno-lint-ignore no-explicit-any
const isObject = (a: any) => !Array.isArray(a) && typeof a === "object";

function get<O = Record<string, unknown>>(
  dataContext: O,
  key?: string,
  defaultValue?: unknown,
): unknown {
  if (!key) {
    return;
  }

  let value = dataContext;

  // TODO: What if the lookup fails?
  key.split(".").forEach((k) => {
    if (isObject(value)) {
      // TODO: How to type
      // @ts-expect-error Recursive until it finds the root
      value = value[k];
    }
  });

  if (isUndefined(value)) {
    return defaultValue;
  }

  return value;
}

export { get, isObject, isUndefined, last };
