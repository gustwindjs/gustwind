import { get, isObject } from "../utilities/functional.ts";
import type { Context } from "./types.ts";

const defaultUtilities = {
  concat: (_: Context, ...parts: string[]) => parts.join(""),
  get: (
    context: Context,
    c: string,
    key: string,
    defaultValue?: unknown,
  ) => {
    const ctx = get(context, c);

    if (!isObject(ctx)) {
      console.error(context, c);
      throw new Error("get - Found context is not an object");
    }

    return get(ctx, key, defaultValue);
  },
  stringify: (_: Context, input: unknown) => JSON.stringify(input, null, 2),
};

export { defaultUtilities };
