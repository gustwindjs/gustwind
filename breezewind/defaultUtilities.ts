import { get, isObject } from "../utilities/functional.ts";
import type { Context } from "./types.ts";

// Note that on top of these, a render utility is injected at index.ts!
const defaultUtilities = {
  id: (s: unknown) => s,
  equals: (a: unknown, b: unknown) => a === b,
  pick: (predicate: boolean, s: unknown) => predicate && s,
  or: (...parts: unknown[]) => parts.some((p) => !!p),
  and: (...parts: unknown[]) => parts.every((p) => !!p),
  concat: (...parts: string[]) => parts.join(""),
  get: function getUtility(
    this: { context?: Context },
    c: string,
    key: string,
    defaultValue?: unknown,
  ) {
    const { context } = this;
    const ctx = get(context, c);

    if (!isObject(ctx)) {
      console.error(context, c);
      throw new Error("get - Found context is not an object");
    }

    return get(ctx, key, defaultValue);
  },
  stringify: (input: unknown) => JSON.stringify(input, null, 2),
};

export { defaultUtilities };
