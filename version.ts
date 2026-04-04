export const VERSION = "0.82.1";

export async function prepublish(_version: string) {
  try {
    const { compilePlugins } = await import("./compilePluginScripts.ts");
    await compilePlugins();
  } catch (error) {
    // TODO: Check why
    // Error: The service was stopped: operation canceled
    // might occur.
    console.error(error);

    return false;
  }
}
