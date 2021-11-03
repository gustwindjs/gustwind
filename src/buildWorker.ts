self.onmessage = async (e) => {
  const [html, js] = await renderPage(route, filePath, context, page);

  fs.ensureDir(dir).then(() => {
    Deno.writeTextFile(
      path.join(dir, "context.json"),
      JSON.stringify(context),
    );
    Deno.writeTextFile(
      path.join(dir, "definition.json"),
      JSON.stringify(page),
    );
    Deno.writeTextFile(
      path.join(dir, "index.html"),
      html,
    );
    if (js) {
      Deno.writeTextFile(path.join(dir, "index.js"), js);
    }
  });
  self.close();
};
