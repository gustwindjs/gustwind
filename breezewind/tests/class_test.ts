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

Deno.test("classList shortcut visibility extension with evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        classList: {
          "font-bold": [
            { context: "context", property: "href" },
            { context: "context", property: "pathname" },
          ],
          "mx-2": [
            { context: "context", property: "href" },
            { context: "context", property: "pathname" },
          ],
          "my-2": [{ context: "context", property: "href" }, { value: "bar" }],
        },
        children: "testing",
      },
      extensions: [extensions.classShortcut],
      context: {
        href: "foo",
        pathname: "foo",
      },
    }),
    '<span class="font-bold mx-2">testing</span>',
  );
});

Deno.test("classList shortcut works with different class types", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        class: "bg-red-200",
        __class: "context.href",
        classList: {
          "font-bold": [
            { context: "context", property: "href" },
            { context: "context", property: "pathname" },
          ],
          "mx-2": [
            { context: "context", property: "href" },
            { context: "context", property: "pathname" },
          ],
          "my-2": [{ context: "context", property: "href" }, { value: "bar" }],
        },
        children: "testing",
      },
      extensions: [extensions.classShortcut],
      context: {
        href: "foo",
        pathname: "foo",
      },
    }),
    '<span class="bg-red-200 foo font-bold mx-2">testing</span>',
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
