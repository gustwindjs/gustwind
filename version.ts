import packageJson from "./package.json" with { type: "json" };

export const VERSION = process.env.GUSTWIND_VERSION ?? packageJson.version;

export async function prepublish(_version: string) {
  return true;
}
