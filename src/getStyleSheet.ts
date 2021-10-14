import { virtualSheet } from "twind-sheets";
import { setup } from "twind";
import sharedTwindSetup from "./sharedTwindSetup.ts";
import type { Mode } from "../types.ts";

// https://twind.dev/handbook/the-shim.html#server
function getStyleSheet(mode: Mode) {
  const sheet = virtualSheet();

  setup({
    sheet,
    ...sharedTwindSetup(mode),
  });

  return sheet;
}

export { getStyleSheet };
