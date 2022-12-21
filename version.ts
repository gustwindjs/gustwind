import { compilePlugins } from "./compilePluginScripts.ts";

export const VERSION = "0.32.2-alpha.1";

export async function prepublish(_version: string) {
  // TODO: Run breezewind tests here
  try {
    await compilePlugins();
  } catch (error) {
    console.error(error);

    return false;
  }
}
