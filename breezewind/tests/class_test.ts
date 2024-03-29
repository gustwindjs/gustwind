import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { install, tw } from "https://esm.sh/@twind/core@1.1.1";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.1";
import breeze from "../mod.ts";
import * as extensions from "../extensions.ts";

// This has to run before tw can work!
install({
  presets: [presetTailwind()],
});

Deno.test("class shortcut extension", async () => {
  assertEquals(
    await breeze({
      component: { type: "span", class: "demo", children: "testing" },
      extensions: [extensions.classShortcut(tw)],
    }),
    '<span class="demo">testing</span>',
  );
});

Deno.test("classList shortcut visibility extension with evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        classList: {
          "font-bold": [
            { utility: "get", parameters: ["context", "href"] },
            { utility: "get", parameters: ["context", "url"] },
          ],
          "mx-2": [
            { utility: "get", parameters: ["context", "href"] },
            { utility: "get", parameters: ["context", "url"] },
          ],
          "my-2": [{ utility: "get", parameters: ["context", "bar"] }],
        },
        children: "testing",
      },
      extensions: [extensions.classShortcut(tw)],
      context: {
        href: "foo",
        url: "foo",
      },
    }),
    '<span class="#wgocpl #wf2app">testing</span>',
  );
});

Deno.test("classList shortcut visibility extension with evaluation and component utility", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "Hello",
      },
      components: {
        Hello: {
          type: "span",
          classList: {
            "font-bold": [
              { utility: "hello" },
            ],
          },
          children: "testing",
        },
      },
      extensions: [extensions.classShortcut(tw)],
      componentUtilities: {
        Hello: {
          hello: () => "hello",
        },
      },
    }),
    '<span class="hello">testing</span>',
  );
});

Deno.test("classList shortcut works with different class types", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        class: {
          utility: "concat",
          parameters: ["bg-red-200", " ", {
            utility: "get",
            parameters: ["context", "href"],
          }],
        },
        classList: {
          "font-bold": [
            { utility: "get", parameters: ["context", "href"] },
            { utility: "get", parameters: ["context", "url"] },
          ],
          "mx-2": [
            { utility: "get", parameters: ["context", "href"] },
            { utility: "get", parameters: ["context", "url"] },
          ],
          "my-2": [{ utility: "get", parameters: ["context", "bar"] }],
        },
        children: "testing",
      },
      extensions: [extensions.classShortcut(tw)],
      context: {
        href: "foo",
        url: "foo",
      },
    }),
    '<span class="foo #3h0el7 #wgocpl #wf2app">testing</span>',
  );
});

Deno.test("class shortcut extension with getter", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        class: { utility: "get", parameters: ["context", "demo"] },
        children: "testing",
      },
      extensions: [extensions.classShortcut(tw)],
      context: { demo: "foobar" },
    }),
    '<span class="foobar">testing</span>',
  );
});

Deno.test("class shortcut extension without tw", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        class: { utility: "get", parameters: ["context", "demo"] },
        children: "testing",
      },
      extensions: [extensions.classShortcut()],
      context: { demo: "foobar" },
    }),
    '<span class="foobar">testing</span>',
  );
});
