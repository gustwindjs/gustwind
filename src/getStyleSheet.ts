import * as twind from "https://cdn.skypack.dev/twind@0.16.16?min";
import * as twindSheets from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";

// https://twind.dev/handbook/the-shim.html#server
function getStyleSheet(twindSetup: Record<string, unknown>) {
  const sheet = twindSheets.virtualSheet();

  twind.setup({
    sheet,
    mode: "silent",
    ...twindSetup,
  });

  return sheet;
}

export { getStyleSheet };
