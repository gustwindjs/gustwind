import * as colors from "twind-colors";
import typography from "twind-typography";
import type { Mode } from "../types.ts";

const sharedTwindSetup = (mode: Mode) => ({
  // https://twind.dev/handbook/configuration.html#mode
  mode: "silent",
  // TODO: This messes up Sidewind logic on the playground page
  // hash: mode === "production",
  theme: { colors },
  plugins: {
    // TODO: How to override blockquote styles?
    ...typography(),
  },
});

export { sharedTwindSetup };
