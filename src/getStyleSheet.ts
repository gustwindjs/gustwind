import * as twind from "https://cdn.skypack.dev/twind@0.16.16?min";
import * as twindSheets from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import { sharedTwindSetup } from "./sharedTwindSetup.ts";
import type { Mode } from "../types.ts";

// https://twind.dev/handbook/the-shim.html#server
function getStyleSheet(mode: Mode, twindSetup: Record<string, unknown>) {
  const sheet = twindSheets.virtualSheet();

  twind.setup({
    sheet,
    ...sharedTwindSetup(mode, twindSetup),
  });

  return sheet;
}

export { getStyleSheet };
