import * as colors from "twind-colors";
import typography from "twind-typography";
import type { Mode } from "../types.ts";

const sharedTwindSetup = (mode: Mode) => ({
  // https://twind.dev/handbook/configuration.html#mode
  mode: "silent",
  hash: mode === "production",
  theme: { colors },
  plugins: {
    // TODO: How to override blockquote styles?
    ...typography(),
  },
});

export default sharedTwindSetup;
