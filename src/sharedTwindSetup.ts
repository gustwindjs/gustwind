import * as twindColors from "https://cdn.skypack.dev/twind@0.16.16/colors?min";
import twindTypography from "https://cdn.skypack.dev/@twind/typography@0.0.2?min";

import type { Mode } from "../types.ts";

const sharedTwindSetup = (mode: Mode) => ({
  // https://twind.dev/handbook/configuration.html#mode
  mode: "silent",
  // TODO: This messes up Sidewind logic on the playground page
  // hash: mode === "production",
  theme: { extend: { colors: twindColors } },
  plugins: {
    // TODO: How to override blockquote styles?
    ...twindTypography(),
  },
});

export { sharedTwindSetup };
