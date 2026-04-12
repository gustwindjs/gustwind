import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import { validateHtmlDirectory, validateHtmlDocument } from "../utilities/htmlValidation.ts";

test("validateHtmlDocument accepts valid HTML", () => {
  assert.doesNotThrow(() => validateHtmlDocument({
    filePath: "index.html",
    html: "<!DOCTYPE html><html><head><title>demo</title></head><body><p>ok</p></body></html>",
  }));
});

test("validateHtmlDocument rejects malformed HTML", () => {
  assert.throws(
    () => validateHtmlDocument({
      filePath: "index.html",
      html: "<!DOCTYPE html><html><head><link rel=\"icon\"></link></head></html>",
    }),
    /index\.html:1:45 end-tag-without-matching-open-element/,
  );
});

test("validateHtmlDirectory checks only html files", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-html-validation-"));

  try {
    await mkdir(path.join(cwd, "nested"), { recursive: true });
    await writeFile(
      path.join(cwd, "index.html"),
      "<!DOCTYPE html><html><body><p>ok</p></body></html>",
    );
    await writeFile(
      path.join(cwd, "nested", "page.html"),
      "<!DOCTYPE html><html><body><input></body></html>",
    );
    await writeFile(
      path.join(cwd, "feed.xml"),
      "<feed><link></link></feed>",
    );

    const result = await validateHtmlDirectory(cwd);

    assert.deepEqual(result, { filesValidated: 2 });
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
});
