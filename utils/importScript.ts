/// <reference lib="dom" />
const loadedScripts: Record<string, boolean> = {};

function importScript(src: string): Promise<"loaded" | "loadedAlready"> {
  return new Promise((resolve, reject) => {
    if (loadedScripts[src]) {
      return resolve("loadedAlready");
    }

    loadedScripts[src] = true;

    const script = document.createElement("script");

    script.setAttribute("type", "module");
    script.setAttribute("src", src);
    script.onload = () => resolve("loaded");
    script.onerror = () => reject();

    document.body.appendChild(script);
  });
}

export { importScript };
