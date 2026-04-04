import * as path from "node:path";
import { assertEquals } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { buildNode } from "./build.ts";

Deno.test("gustwind-node builds a site from path-based plugins", async () => {
  const cwd = await Deno.makeTempDir({ prefix: "gustwind-node-build-" });

  try {
    await Deno.mkdir(path.join(cwd, "public"), { recursive: true });
    await Deno.writeTextFile(
      path.join(cwd, "public", "copied.txt"),
      "copied\n",
    );
    await Deno.writeTextFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies static routes for the Node build test.",
  },
  init() {
    const routes = {
      "/": {
        layout: "Page",
        context: { message: "home" },
      },
      "feed.xml": {
        layout: "Feed",
        context: { message: "feed" },
      },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        if (url === "/") {
          return routes["/"];
        }
        if (url === "/feed.xml/") {
          return routes["feed.xml"];
        }
      },
    };
  },
};
`.trimStart(),
    );
    await Deno.writeTextFile(
      path.join(cwd, "renderer-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Renders simple HTML/XML output for the Node build test.",
  },
  init() {
    return {
      prepareContext({ route, url }) {
        return {
          context: {
            ...(route.context || {}),
            url,
          },
        };
      },
      renderLayout({ route, context, url }) {
        if (url.endsWith(".xml/")) {
          return \`<feed>\${context.message}</feed>\`;
        }

        return \`<html><body><h1>\${route.layout}</h1><p>\${context.message}</p></body></html>\`;
      },
    };
  },
};
`.trimStart(),
    );
    await Deno.writeTextFile(
      path.join(cwd, "assets-plugin.ts"),
      `
import * as path from "node:path";

export const plugin = {
  meta: {
    name: "test-assets-plugin",
    description: "Emits extra output files for the Node build test.",
  },
  init({ cwd, outputDirectory }) {
    return {
      prepareBuild() {
        return [{
          type: "writeTextFile",
          payload: {
            outputDirectory,
            file: path.join("assets", "hello.txt"),
            data: "hello\\n",
          },
        }];
      },
      finishBuild() {
        return [{
          type: "copyFiles",
          payload: {
            inputDirectory: path.join(cwd, "public"),
            outputDirectory,
            outputPath: "copied",
          },
        }];
      },
    };
  },
};
`.trimStart(),
    );

    const outputDirectory = path.join(cwd, "dist");

    await buildNode({
      cwd,
      outputDirectory,
      pluginDefinitions: [
        { path: "./router-plugin.ts", options: {}, module: undefined as never },
        { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
        { path: "./assets-plugin.ts", options: {}, module: undefined as never },
      ],
    });

    assertEquals(
      await Deno.readTextFile(path.join(outputDirectory, "index.html")),
      "<html><body><h1>Page</h1><p>home</p></body></html>",
    );
    assertEquals(
      await Deno.readTextFile(path.join(outputDirectory, "feed.xml")),
      "<feed>feed</feed>",
    );
    assertEquals(
      await Deno.readTextFile(path.join(outputDirectory, "assets", "hello.txt")),
      "hello\n",
    );
    assertEquals(
      await Deno.readTextFile(path.join(outputDirectory, "copied", "copied.txt")),
      "copied\n",
    );
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});
