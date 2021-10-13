// TODO: Consider using an import map for this
// https://deno.land/manual@v1.14.2/typescript/runtime#bundling
import { setup } from "twind-shim";
import sharedTwindSetup from "./sharedTwindSetup.ts";

setup({
  // @ts-ignore This file will be compiled for the browser
  target: document.body,
  ...sharedTwindSetup,
});
