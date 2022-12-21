import { compilePlugins } from "./compilePluginScripts.ts";

export const VERSION = "0.32.2";

export async function prepublish(_version: string) {
  // TODO: Run breezewind tests here
  try {
    await compilePlugins();
  } catch (error) {
    console.error(error);

    return false;
  }
}
