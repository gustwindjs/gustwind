import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import { startDevServer } from "./dev.ts";

test(
  "gustwind-node serves routes and generated assets through the Vite dev server",
  async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-dev-"));

    try {
      await mkdir(path.join(cwd, "public"), { recursive: true });
      await writeFile(path.join(cwd, "public", "copied.txt"), "copied\n");
      await writeFile(
        path.join(cwd, "router-plugin.ts"),
        `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies static routes for the Node dev-server test.",
  },
  init() {
    const routes = {
      "/": {
        layout: "Page",
        context: { message: "home" },
      },
      "/feed.xml": {
        layout: "Feed",
        context: { message: "feed" },
      },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        return routes[url];
      },
    };
  },
};
`.trimStart(),
      );
      await writeFile(
        path.join(cwd, "renderer-plugin.ts"),
        `
export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Renders simple HTML/XML output for the Node dev-server test.",
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
        if (url.endsWith(".xml")) {
          return \`<feed>\${context.message}</feed>\`;
        }

        return \`<html><body><h1>\${route.layout}</h1><p>\${context.message}</p></body></html>\`;
      },
    };
  },
};
`.trimStart(),
      );
      await writeFile(
        path.join(cwd, "assets-plugin.ts"),
        `
import * as path from "node:path";

export const plugin = {
  meta: {
    name: "test-assets-plugin",
    description: "Emits extra output files for the Node dev-server test.",
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

      const server = await startDevServer({
        cwd,
        pluginDefinitions: [
          { path: "./router-plugin.ts", options: {}, module: undefined as never },
          { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
          { path: "./assets-plugin.ts", options: {}, module: undefined as never },
        ],
        port: 0,
      });

      try {
        const routeResponse = await fetch(server.url);
        const routeHtml = await routeResponse.text();
        const xmlResponse = await fetch(new URL("/feed.xml", server.url));
        const generatedAsset = await fetch(
          new URL("/assets/hello.txt", server.url),
        );
        const copiedAsset = await fetch(
          new URL("/copied/copied.txt", server.url),
        );

        assert.equal(routeResponse.status, 200);
        assert.equal(xmlResponse.status, 200);
        assert.equal(generatedAsset.status, 200);
        assert.equal(copiedAsset.status, 200);
        assert.match(routeHtml, /\/@vite\/client/);
        assert.match(routeHtml, /<h1>Page<\/h1>/);
        assert.equal(await xmlResponse.text(), "<feed>feed</feed>");
        assert.equal(await generatedAsset.text(), "hello\n");
        assert.equal(await copiedAsset.text(), "copied\n");
      } finally {
        await server.close();
      }
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  },
);

test(
  "gustwind-node serves route client scripts through Vite source entries in development",
  async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-dev-scripts-"));

    try {
      await mkdir(path.join(cwd, "site", "scripts"), { recursive: true });
      await writeFile(
        path.join(cwd, "site", "scripts", "hello.ts"),
        `console.log("hello from vite dev");\n`,
      );
      await writeFile(
        path.join(cwd, "router-plugin.ts"),
        `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies static routes for the Vite dev script test.",
  },
  init() {
    const routes = {
      "/": {
        layout: "Page",
        scripts: [{ name: "hello" }],
      },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        return routes[url];
      },
    };
  },
};
`.trimStart(),
      );
      await writeFile(
        path.join(cwd, "renderer-plugin.ts"),
        `
export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Renders script tags for the Vite dev script test.",
  },
  init() {
    return {
      renderLayout({ context }) {
        const scripts = (context.scripts || []).map(({ src, type }) =>
          \`<script type="\${type}" src="\${src}"></script>\`
        ).join("");

        return \`<html><body>\${scripts}</body></html>\`;
      },
    };
  },
};
`.trimStart(),
      );

      const server = await startDevServer({
        cwd,
        pluginDefinitions: [
          { path: "./router-plugin.ts", options: {}, module: undefined as never },
          { path: path.resolve("plugins/script/mod.ts"), options: { scriptsPath: ["./site/scripts"] }, module: undefined as never },
          { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
        ],
        port: 0,
      });

      try {
        const routeResponse = await fetch(server.url);
        const routeHtml = await routeResponse.text();

        assert.equal(routeResponse.status, 200);
        assert.match(routeHtml, /\/@vite\/client/);
        assert.match(routeHtml, /\/site\/scripts\/hello\.ts/);

        const scriptResponse = await fetch(
          new URL("/site/scripts/hello.ts", server.url),
        );
        const scriptBody = await scriptResponse.text();

        assert.equal(scriptResponse.status, 200);
        assert.match(scriptBody, /hello from vite dev/);
      } finally {
        await server.close();
      }
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  },
);
