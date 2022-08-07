import { get } from "../utils/functional.ts";
import { Context } from "./types.ts";

const defaultUtilities = {
  concat: (_: Context, a: string, b: string) => `${a}${b}`,
  get: (
    context: Context,
    c: string,
    key: string,
    defaultValue?: unknown,
  ) => get(get(context, c), key, defaultValue),
};

export { defaultUtilities };
