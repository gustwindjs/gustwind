import { Application } from "https://deno.land/x/oak@v6.3.2/mod.ts";
import { setup, tw } from "https://unpkg.com/twind@0.16.16/twind.js";
import {
  getStyleTag,
  virtualSheet,
} from "https://unpkg.com/twind@0.16.16/sheets/sheets.js";

// https://twind.dev/handbook/the-shim.html#server
const getStyleSheet = () => {
  const sheet = virtualSheet();

  setup({ sheet });

  return sheet;
};

const readFileSync = (file: string) => Deno.readTextFileSync(file);

// deno-lint-ignore no-explicit-any
const isObject = (a: any) => typeof a === "object";

export { Application, getStyleSheet, getStyleTag, isObject, readFileSync, tw };
