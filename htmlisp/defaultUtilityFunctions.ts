import { get, isObject } from "../utilities/functional.ts";
import { trim } from "../utilities/string.ts";
import type { Context } from "./types.ts";
import { raw, resolveScopedValue } from "./utilities/runtime.ts";

function id(s: unknown) {
  return s;
}

function equals(a: unknown, b: unknown) {
  return a === b;
}

function pick(predicate: boolean, s: unknown) {
  return predicate ? s : "";
}

function or(...parts: unknown[]) {
  return parts.some((p) => !!p);
}

function and(...parts: unknown[]) {
  return parts.every((p) => !!p);
}

function concat(...parts: string[]) {
  return parts.join("");
}

function not(b: boolean) {
  return !b;
}

function getUtility(
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
}

function rawUtility(
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
}

function resolve(
  this: { context?: Context; props?: Context; local?: Context },
  key: string,
  defaultValue?: unknown,
) {
  return resolveScopedValue(this, key, defaultValue);
}

function stringify(input: unknown) {
  return JSON.stringify(input, null, 2);
}

export {
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
};
