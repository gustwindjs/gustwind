import type { Mode } from "../types.ts";

const sharedTwindSetup = (
  mode: Mode,
  twindSetup: Record<string, unknown> = {},
) => ({
  // https://twind.dev/handbook/configuration.html#mode
  mode: "silent",
  // TODO: This messes up Sidewind logic on the playground page
  // hash: mode === "production",
  ...twindSetup,
});

export { sharedTwindSetup };
