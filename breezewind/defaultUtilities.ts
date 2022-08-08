import { get } from "../utils/functional.ts";
import { Context } from "./types.ts";

const defaultUtilities = {
  concat: (_: Context, ...parts: string[]) => parts.join(""),
  get: (
    context: Context,
    c: string,
    key: string,
    defaultValue?: unknown,
  ) => get(get(context, c), key, defaultValue),
};

export { defaultUtilities };
