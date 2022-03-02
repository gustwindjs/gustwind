import { compileGustwindScripts } from "./compileGustwindScripts.ts";

export const VERSION = "0.19.6";

export async function prepublish(_version: string) {
  try {
    await compileGustwindScripts("./scripts");
  } catch (error) {
    console.error(error);

    return false;
  }
}
