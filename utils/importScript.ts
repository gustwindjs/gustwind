/// <reference lib="dom" />
const loadedScripts: Record<string, boolean> = {};

function importScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (loadedScripts[src]) {
      return;
    }

    loadedScripts[src] = true;

    const script = document.createElement("script");

    script.setAttribute("type", "module");
    script.setAttribute("src", src);
    script.onload = () => resolve();
    script.onerror = () => reject();

    document.body.appendChild(script);
  });
}

export { importScript };
