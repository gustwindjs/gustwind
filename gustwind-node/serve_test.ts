import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import { startStaticServer } from "./serve.ts";

test("gustwind-node serves a static build directory", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-serve-"));

  try {
    await mkdir(path.join(cwd, "build", "nested"), { recursive: true });
    await writeFile(
      path.join(cwd, "build", "index.html"),
      "<html><body>home</body></html>",
    );
    await writeFile(path.join(cwd, "build", "nested", "index.html"), "nested");
    await writeFile(path.join(cwd, "build", "hello.txt"), "hello\n");

    const server = await startStaticServer({
      cwd,
      input: "build",
      port: 0,
    });

    try {
      const homeResponse = await fetch(server.url);
      const nestedResponse = await fetch(new URL("/nested", server.url));
      const textResponse = await fetch(new URL("/hello.txt", server.url));
      const missingResponse = await fetch(new URL("/missing", server.url));

      assert.equal(homeResponse.status, 200);
      assert.equal(nestedResponse.status, 200);
      assert.equal(textResponse.status, 200);
      assert.equal(missingResponse.status, 404);
      assert.equal(
        homeResponse.headers.get("content-type"),
        "text/html; charset=utf-8",
      );
      assert.equal(await homeResponse.text(), "<html><body>home</body></html>");
      assert.equal(await nestedResponse.text(), "nested");
      assert.equal(await textResponse.text(), "hello\n");
      assert.equal(await missingResponse.text(), "No matching route");
    } finally {
      await server.close();
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
