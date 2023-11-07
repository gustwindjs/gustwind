import { compilePlugins } from "./compilePluginScripts.ts";

export const VERSION = "0.52.0";

export async function prepublish(_version: string) {
  // TODO: Run breezewind tests here
  try {
    await compilePlugins();
  } catch (error) {
    // TODO: Check why
    // Error: The service was stopped: operation canceled
    // might occur.
    console.error(error);

    return false;
  }
}
