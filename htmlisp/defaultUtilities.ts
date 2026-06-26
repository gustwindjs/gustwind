import {
  and,
  concat,
  equals,
  getUtility,
  id,
  not,
  or,
  pick,
  rawUtility,
  resolve,
  stringify,
  trim,
} from "./defaultUtilityFunctions.ts";

// Note that on top of these, a render utility is injected at index.ts!
const defaultUtilities = {
  id,
  equals,
  pick,
  or,
  and,
  concat,
  not,
  get: getUtility,
  raw: rawUtility,
  resolve,
  stringify,
  trim,
};

export { defaultUtilities };
