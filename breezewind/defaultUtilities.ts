import { get } from "../utils/functional.ts";

const defaultUtilities = {
  concat: (a: string, b: string) => `${a}${b}`,
  get,
};

export { defaultUtilities };
