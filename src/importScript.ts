function importScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.setAttribute("src", src);
    script.onload = () => resolve();
    script.onerror = () => reject();

    document.body.appendChild(script);
  });
}

export { importScript };
