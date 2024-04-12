import { compilePlugins } from "./compilePluginScripts.ts";

export const VERSION = "0.66.6";

export async function prepublish(_version: string) {
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
