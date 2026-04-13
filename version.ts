export const VERSION = process.env.GUSTWIND_VERSION ?? "0.82.1";

export async function prepublish(_version: string) {
  return true;
}
