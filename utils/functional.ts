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
  if (!isObject(dataContext)) {
    console.error(dataContext);
    throw new Error("get - data context is not an object!");
  }

  if (!key) {
    return defaultValue;
  }

  let value = dataContext;

  const keyParts = key.split(".");

  if (keyParts.length === 1) {
    if (dataContext) {
      // @ts-expect-error This is ok
      const value = dataContext[key];

      return isUndefined(value) ? defaultValue : value;
    }

    return defaultValue;
  }

  // TODO: What if the lookup fails?
  keyParts.forEach((k) => {
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
