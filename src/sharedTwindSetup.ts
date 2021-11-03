import { twindColors, twindTypography } from "../browserDeps.ts";
import type { Mode } from "../types.ts";

const sharedTwindSetup = (mode: Mode) => ({
  // https://twind.dev/handbook/configuration.html#mode
  mode: "silent",
  // TODO: This messes up Sidewind logic on the playground page
  // hash: mode === "production",
  theme: { colors: twindColors },
  plugins: {
    // TODO: How to override blockquote styles?
    ...twindTypography(),
  },
});

export { sharedTwindSetup };
