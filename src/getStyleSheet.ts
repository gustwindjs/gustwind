import { virtualSheet } from "twind-sheets";
import { setup } from "twind";
import sharedTwindSetup from "./sharedTwindSetup.ts";

// https://twind.dev/handbook/the-shim.html#server
function getStyleSheet() {
  const sheet = virtualSheet();

  setup({
    sheet,
    ...sharedTwindSetup,
  });

  return sheet;
}

export { getStyleSheet };
