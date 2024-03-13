function last<O>(array: O[]) {
  return array[array.length - 1];
}

function isBoolean(str?: unknown) {
  return typeof str === "boolean";
}

function isNull(str?: unknown) {
  return str === null;
}

function isString(str?: string) {
  return typeof str === "string";
}

function isUndefined(str?: unknown) {
  return typeof str == "undefined";
}

// deno-lint-ignore no-explicit-any
const isObject = (a: any) =>
  a !== null && !Array.isArray(a) && typeof a === "object";

function get<O = Record<string, unknown>>(
  dataContext: O,
  key?: string,
  defaultValue?: unknown,
): unknown {
  if (!isObject(dataContext)) {
    console.error("context", dataContext);
    throw new Error("get - data context is not an object!");
  }

  if (!key) {
    return defaultValue;
  }

  if (!isString(key)) {
    console.error("key", key);
    throw new Error("get - key is not a string");
  }

  let value = dataContext;

  const keyParts = key.split(".");

  if (keyParts.length === 1) {
    if (dataContext) {
      // @ts-expect-error This is ok
      const value = dataContext[key];

      return isUndefined(value) || isNull(value) ? defaultValue : value;
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

  if (isUndefined(value) || isNull(value)) {
    return defaultValue;
  }

  return value;
}

function omit<V = unknown>(o: Record<string, V> | undefined, k: string) {
  if (!o) {
    return {};
  }

  // TODO: Likely there is a better way to omit but this will do for now
  const ret = { ...o };

  delete ret[k];

  return ret;
}

export { get, isBoolean, isObject, isString, isUndefined, last, omit };
