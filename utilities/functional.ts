function last<O>(array: O[]) {
  return array[array.length - 1];
}

function isBoolean(str?: unknown) {
  return typeof str === "boolean";
}

function isNull(str?: unknown) {
  return str === null;
}

function isString(str?: unknown) {
  return typeof str === "string";
}

function isUndefined(str?: unknown) {
  return typeof str == "undefined";
}

const isObject = (a: any) =>
  a !== null && !Array.isArray(a) && typeof a === "object";

function get<O = Record<string, unknown>>(
  dataContext: O,
  key?: string,
  defaultValue?: unknown,
): unknown {
  assertObjectContext(dataContext);

  if (!key) {
    return defaultValue;
  }

  assertStringKey(key);

  const keyParts = key.split(".");

  return keyParts.length === 1
    ? getDirectValue(dataContext, key, defaultValue)
    : getNestedValue(dataContext, keyParts, defaultValue);
}

function assertObjectContext(dataContext: unknown) {
  if (!isObject(dataContext)) {
    console.error("context", dataContext);
    throw new Error("get - data context is not an object!");
  }
}

function assertStringKey(key: unknown) {
  if (!isString(key)) {
    console.error("key", key);
    throw new Error("get - key is not a string");
  }
}

function getDirectValue(
  dataContext: unknown,
  key: string,
  defaultValue?: unknown,
) {
  if (!dataContext) {
    return defaultValue;
  }

  const value = (dataContext as Record<string, unknown>)[key];

  return getDefinedValue(value, defaultValue);
}

function getNestedValue(
  dataContext: unknown,
  keyParts: string[],
  defaultValue?: unknown,
) {
  let value = dataContext;
  // TODO: What if the lookup fails?
  keyParts.forEach((k) => {
    if (isObject(value)) {
      value = (value as Record<string, unknown>)[k];
    }
  });

  return getDefinedValue(value, defaultValue);
}

function getDefinedValue(value: unknown, defaultValue?: unknown) {
  return isUndefined(value) || isNull(value) ? defaultValue : value;
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
