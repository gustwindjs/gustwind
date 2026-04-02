import { get, isObject } from "../utilities/functional.ts";
import { trim } from "../utilities/string.ts";
import type { Context } from "./types.ts";
import { raw, resolveScopedValue } from "./utilities/runtime.ts";

// Note that on top of these, a render utility is injected at index.ts!
const defaultUtilities = {
  id: (s: unknown) => s,
  equals: (a: unknown, b: unknown) => a === b,
  pick: function pick(predicate: boolean, s: unknown) {
    return predicate ? s : "";
  },
  or: (...parts: unknown[]) => parts.some((p) => !!p),
  and: (...parts: unknown[]) => parts.every((p) => !!p),
  concat: (...parts: string[]) => parts.join(""),
  not: (b: boolean) => !b,
  get: function getUtility(
    this: { context?: Context },
    c: string,
    key: string,
    defaultValue?: unknown,
  ) {
    const ctx = get(this, c);

    if (!isObject(ctx)) {
      console.error("get - context", this, "context key", c);
      throw new Error("get - Found context is not an object");
    }

    return get(ctx, key, defaultValue);
  },
  raw: function rawUtility(
    this: { context?: Context; props?: Context; local?: Context },
    value: unknown,
  ) {
    if (typeof value === "string") {
      const resolved = resolveScopedValue(this, value);

      if (typeof resolved !== "undefined" && resolved !== null) {
        return raw(resolved);
      }
    }

    return raw(value);
  },
  resolve: function resolve(
    this: { context?: Context; props?: Context; local?: Context },
    key: string,
    defaultValue?: unknown,
  ) {
    return resolveScopedValue(this, key, defaultValue);
  },
  stringify: (input: unknown) => JSON.stringify(input, null, 2),
  trim,
};

export { defaultUtilities };
