import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import { setupTwind, virtualSheet } from "../../client-deps.ts";
import breeze from "../index.ts";
import * as extensions from "../extensions.ts";

const stylesheet = virtualSheet();

setupTwind({ sheet: stylesheet, mode: "silent" });

Deno.test("class shortcut extension", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", class: "demo", children: "testing" },
      extensions: [extensions.classShortcut],
    }),
    '<span class="demo">testing</span>',
  );
});

Deno.test("class shortcut visibility extension with evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        class: {
          "font-bold": "context.href === context.pathname",
        },
        children: "testing",
      },
      extensions: [extensions.classShortcut],
      context: {
        href: "foo",
        pathname: "foo",
      },
    }),
    '<span class="font-bold">testing</span>',
  );
});

Deno.test("class shortcut extension with getter", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        __class: "context.demo",
        children: "testing",
      },
      extensions: [extensions.classShortcut],
      context: { demo: "foobar" },
    }),
    '<span class="foobar">testing</span>',
  );
});

Deno.test("class shortcut extension with evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        "==class": "context.demo + 'bar'",
        children: "testing",
      },
      extensions: [extensions.classShortcut],
      context: { demo: "foo" },
    }),
    '<span class="foobar">testing</span>',
  );
});

// TODO: Rename class shortcut as classList
