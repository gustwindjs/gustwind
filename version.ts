import { compileGustwindScripts } from "./compileGustwindScripts.ts";

export const VERSION = "0.26.4";

export async function prepublish(_version: string) {
  try {
    await compileGustwindScripts("./scripts");
  } catch (error) {
    console.error(error);

    return false;
  }
}
