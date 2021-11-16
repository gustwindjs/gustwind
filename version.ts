import { compileGustwindScripts } from "./compileGustwindScripts.ts";

export const VERSION = "0.13.5";

export async function prepublish(_version: string) {
  try {
    await compileGustwindScripts("./scripts");
  } catch (error) {
    console.error(error);

    return false;
  }
}
