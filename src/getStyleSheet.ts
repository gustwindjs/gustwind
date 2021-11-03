import { twind, twindSheets } from "../deps.ts";
import { sharedTwindSetup } from "./sharedTwindSetup.ts";
import type { Mode } from "../types.ts";

// https://twind.dev/handbook/the-shim.html#server
function getStyleSheet(mode: Mode) {
  const sheet = twindSheets.virtualSheet();

  twind.setup({
    sheet,
    ...sharedTwindSetup(mode),
  });

  return sheet;
}

export { getStyleSheet };
