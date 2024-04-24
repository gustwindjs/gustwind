import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("doctype", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: "<!DOCTYPE html>" }),
    "<!DOCTYPE html>",
  );
});

Deno.test("doctype and content", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput:
        `<!DOCTYPE html><div &title="(get context meta.siteName)">hello</div>`,
      context: {
        meta: { siteName: "demo" },
      },
    }),
    `<!DOCTYPE html><div title="demo">hello</div>`,
  );
});

Deno.test("doctype and content with a newline", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<!DOCTYPE html>
    <div &title="(get context meta.siteName)">hello</div>`,
      context: {
        meta: { siteName: "demo" },
      },
    }),
    `<!DOCTYPE html><div title="demo">hello</div>`,
  );
});
