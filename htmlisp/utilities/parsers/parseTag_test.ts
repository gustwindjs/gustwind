import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTag } from "./parseTag.ts";
import { characterGenerator } from "./characterGenerator.ts";

Deno.test("content", () => {
  assertEquals(
    parseTag(characterGenerator(`foobar`)),
    ["foobar"],
  );
});

Deno.test("self-closing tag 1", () => {
  assertEquals(
    parseTag(characterGenerator(`<a/>`)),
    [{ type: "a", attributes: {}, children: [] }],
  );
});

Deno.test("self-closing tag 2", () => {
  assertEquals(
    parseTag(characterGenerator(`<a />`)),
    [{ type: "a", attributes: {}, children: [] }],
  );
});

Deno.test("multiple self-closing tags", () => {
  assertEquals(
    parseTag(characterGenerator(`<a /><a />`)),
    [{ type: "a", attributes: {}, children: [] }, {
      type: "a",
      attributes: {},
      children: [],
    }],
  );
});

Deno.test("self-closing tag with a single attribute", () => {
  assertEquals(
    parseTag(characterGenerator(`<a href="test" />`)),
    [{ type: "a", attributes: { href: "test" }, children: [] }],
  );
});

Deno.test("self-closing tag with attributes", () => {
  assertEquals(
    parseTag(characterGenerator(`<a href="test" title="foobar" />`)),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }],
  );
});

Deno.test("simple tag", () => {
  assertEquals(
    parseTag(characterGenerator(`<span>foobar</span>`)),
    [{
      type: "span",
      children: ["foobar"],
      attributes: {},
    }],
  );
});

Deno.test("two tags with a newline in between", () => {
  assertEquals(
    parseTag(characterGenerator(`<span>foobar</span>\n<span>foobar</span>`)),
    [{
      type: "span",
      children: ["foobar"],
      attributes: {},
    }, {
      type: "span",
      children: ["foobar"],
      attributes: {},
    }],
  );
});

Deno.test("simple tag with an attribute at the end", () => {
  assertEquals(
    parseTag(characterGenerator(`<span title>foobar</span>`)),
    [{
      type: "span",
      children: ["foobar"],
      attributes: { title: null },
    }],
  );
});

Deno.test("simple tag with attributes", () => {
  assertEquals(
    parseTag(characterGenerator(`<a href="test" title="foobar"></a>`)),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }],
  );
});

Deno.test("tag with single quotes in an attribute", () => {
  assertEquals(
    parseTag(characterGenerator(`<a href="t'e's't"</a>`)),
    [{
      type: "a",
      attributes: { href: "t'e's't" },
      children: [],
    }],
  );
});

Deno.test("simple tag with attributes and newlines in between", () => {
  assertEquals(
    parseTag(characterGenerator(`<a
  href="test"
  title="foobar"></a>`)),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }],
  );
});

Deno.test("simple tag with content", () => {
  assertEquals(
    parseTag(characterGenerator(`<a href="test" title="foobar">barfoo</a>`)),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: ["barfoo"],
    }],
  );
});

Deno.test("simple tag with another tag", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<a href="test" title="foobar"><span>barfoo</span></a>`,
      ),
    ),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [{
        type: "span",
        attributes: {},
        children: ["barfoo"],
      }],
    }],
  );
});

Deno.test("self-closing siblings", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<a href="test" title="foobar" /><a href="test" title="foobar" />`,
      ),
    ),
    [
      {
        type: "a",
        attributes: { href: "test", title: "foobar" },
        children: [],
      },
      {
        type: "a",
        attributes: { href: "test", title: "foobar" },
        children: [],
      },
    ],
  );
});

Deno.test("multiple siblings", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<Button><div>foo</div><div>bar</div></Button>`,
      ),
    ),
    [
      {
        type: "Button",
        attributes: {},
        children: [
          {
            type: "div",
            attributes: {},
            children: ["foo"],
          },
          {
            type: "div",
            attributes: {},
            children: ["bar"],
          },
        ],
      },
    ],
  );
});

Deno.test("siblings only with former children", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<div class="bar"><span>foo</span></div><div class="bar">foo</div>`,
      ),
    ),
    [
      {
        type: "div",
        attributes: {
          class: "bar",
        },
        children: [
          {
            type: "span",
            attributes: {},
            children: ["foo"],
          },
        ],
      },
      {
        type: "div",
        attributes: {
          class: "bar",
        },
        children: ["foo"],
      },
    ],
  );
});

Deno.test("sibling tags", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<a href="test" title="foobar">foo</a><a href="test" title="foobar">bar</a>`,
      ),
    ),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: ["foo"],
    }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: ["bar"],
    }],
  );
});

Deno.test("siblings with only children", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<div><span>foo</span></div><div><span>foo</span></div>`,
      ),
    ),
    [{
      type: "div",
      attributes: {},
      children: [{
        type: "span",
        attributes: {},
        children: ["foo"],
      }],
    }, {
      type: "div",
      attributes: {},
      children: [{
        type: "span",
        attributes: {},
        children: ["foo"],
      }],
    }],
  );
});

Deno.test("simple doctype", () => {
  assertEquals(
    parseTag(characterGenerator(`<!DOCTYPE html>`)),
    [{
      type: "!DOCTYPE",
      attributes: { html: null },
      closesWith: "",
      children: [],
    }],
  );
});

Deno.test("simple doctype and content", () => {
  assertEquals(
    parseTag(characterGenerator(`<!DOCTYPE html>foobar`)),
    [{
      type: "!DOCTYPE",
      attributes: { html: null },
      closesWith: "",
      children: [],
    }, "foobar"],
  );
});

Deno.test("simple doctype and element", () => {
  assertEquals(
    parseTag(characterGenerator(`<!DOCTYPE html><div>foobar</div>`)),
    [{
      type: "!DOCTYPE",
      attributes: { html: null },
      closesWith: "",
      children: [],
    }, {
      type: "div",
      attributes: {},
      children: ["foobar"],
    }],
  );
});

Deno.test("full doctype", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<!DOCTYPE html>
        <a href="test" title="foobar" /><a href="test" title="foobar" />`,
      ),
    ),
    [{
      type: "!DOCTYPE",
      attributes: { html: null },
      closesWith: "",
      children: [],
    }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }],
  );
});

Deno.test("xml", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<?xml version="1.0" encoding="utf-8" ?>`,
      ),
    ),
    [{
      type: "?xml",
      attributes: { version: "1.0", encoding: "utf-8" },
      closesWith: "?",
      children: [],
    }],
  );
});

Deno.test("xml with a newline", () => {
  assertEquals(
    parseTag(
      characterGenerator(
        `<?xml version="1.0" encoding="utf-8" ?>
<div>foo</div>`,
      ),
    ),
    [{
      type: "?xml",
      attributes: { version: "1.0", encoding: "utf-8" },
      closesWith: "?",
      children: [],
    }, {
      type: "div",
      attributes: {},
      children: ["foo"],
    }],
  );
});

Deno.test("content before element", () => {
  assertEquals(
    parseTag(characterGenerator(`<div>bar<span>foo</span></div>`)),
    [{
      type: "div",
      attributes: {},
      children: ["bar", {
        type: "span",
        attributes: {},
        children: ["foo"],
      }],
    }],
  );
});

Deno.test("content after element", () => {
  assertEquals(
    parseTag(characterGenerator(`<div><span>foo</span>bar</div>`)),
    [{
      type: "div",
      attributes: {},
      children: [{
        type: "span",
        attributes: {},
        children: ["foo"],
      }, "bar"],
    }],
  );
});

Deno.test("content before and after element", () => {
  assertEquals(
    parseTag(characterGenerator(`bar<span>foo</span>bar`)),
    ["bar", {
      type: "span",
      attributes: {},
      children: ["foo"],
    }, "bar"],
  );
});

Deno.test("element before and after content", () => {
  assertEquals(
    parseTag(characterGenerator(`<span>foo</span>bar<span>foo</span>`)),
    [
      {
        type: "span",
        attributes: {},
        children: ["foo"],
      },
      "bar",
      {
        type: "span",
        attributes: {},
        children: ["foo"],
      },
    ],
  );
});

Deno.test("content after element 2", () => {
  assertEquals(
    parseTag(characterGenerator(`<div>foo</div>bar`)),
    [{
      type: "div",
      attributes: {},
      children: ["foo"],
    }, "bar"],
  );
});

Deno.test("complex newlines", () => {
  assertEquals(
    parseTag(characterGenerator(`<BaseLayout>
    <slot name="content">
      <div>hello</div>
    </slot>
  </BaseLayout>
`)),
    [{
      type: "BaseLayout",
      attributes: {},
      children: [{
        type: "slot",
        attributes: { name: "content" },
        children: [{
          type: "div",
          attributes: {},
          children: ["hello"],
        }],
      }],
    }],
  );
});

Deno.test("integration 1", () => {
  assertEquals(
    parseTag(characterGenerator(`<html &lang="(get context meta.language)">
  <head>
    <link
      rel="icon"
      href="demo"
    />
  </head>
  <body>
    <MainNavigation />
  </body>
</html>
`)),
    [{
      type: "html",
      attributes: { "&lang": "(get context meta.language)" },
      children: [
        {
          type: "head",
          attributes: {},
          children: [
            {
              type: "link",
              attributes: { rel: "icon", href: "demo" },
              children: [],
            },
          ],
        },
        {
          type: "body",
          attributes: {},
          children: [
            {
              type: "MainNavigation",
              attributes: {},
              children: [],
            },
          ],
        },
      ],
    }],
  );
});

Deno.test("integration 2", () => {
  assertEquals(
    parseTag(characterGenerator(`<!DOCTYPE html>
<html &lang="(get context meta.language)">
  <head>
    <link
      rel="icon"
      href="demo"
    />
    <link
      rel="preload"
      href="demo"
      as="style"
    />
    <meta
      property="og:image"
      &content="(concat
  foobar/
  (get context meta.title)
)"
    />
  </head>
  <body>
    <MainNavigation />
    <aside &children="(render (get props aside))"></aside>
    <main &children="(render (get props content))"></main>
    <MainFooter />
  </body>
</html>
`)),
    [{
      type: "!DOCTYPE",
      attributes: { html: null },
      children: [],
      closesWith: "",
    }, {
      type: "html",
      attributes: { "&lang": "(get context meta.language)" },
      children: [
        {
          type: "head",
          attributes: {},
          children: [
            {
              type: "link",
              attributes: { rel: "icon", href: "demo" },
              children: [],
            },
            {
              type: "link",
              attributes: { rel: "preload", href: "demo", as: "style" },
              children: [],
            },
            {
              type: "meta",
              attributes: {
                property: "og:image",
                "&content": `(concat
  foobar/
  (get context meta.title)
)`,
              },
              children: [],
            },
          ],
        },
        {
          type: "body",
          attributes: {},
          children: [
            {
              type: "MainNavigation",
              attributes: {},
              children: [],
            },
            {
              type: "aside",
              attributes: { "&children": "(render (get props aside))" },
              children: [],
            },
            {
              type: "main",
              attributes: { "&children": "(render (get props content))" },
              children: [],
            },
            {
              type: "MainFooter",
              attributes: {},
              children: [],
            },
          ],
        },
      ],
    }],
  );
});

Deno.test("integration 3", () => {
  assertEquals(
    parseTag(characterGenerator(`<BaseLayout>
  <slot name="content">
    <header class="bg-gradient-to-br from-purple-200 to-emerald-100 py-8">
      <div class="sm:mx-auto px-4 py-4 sm:py-8 max-w-3xl flex">
        <div class="flex flex-col gap-8">
          <h1 class="text-4xl md:text-8xl">
            <span class="whitespace-nowrap pr-4">🐳💨</span>
            <span>Gustwind</span>
          </h1>
          <h2 class="text-xl md:text-4xl font-extralight">
            Deno powered website creator
          </h2>
        </div>
      </div>
    </header>
    <div
      class="md:mx-auto my-8 px-4 md:px-0 w-full lg:max-w-3xl prose lg:prose-xl"
      &children="(get context readme.content)"
    ></div>
  </slot>
</BaseLayout>
`)),
    [{
      type: "BaseLayout",
      attributes: {},
      children: [
        {
          type: "slot",
          attributes: { name: "content" },
          children: [{
            type: "header",
            attributes: {
              class: "bg-gradient-to-br from-purple-200 to-emerald-100 py-8",
            },
            children: [{
              type: "div",
              attributes: {
                class: "sm:mx-auto px-4 py-4 sm:py-8 max-w-3xl flex",
              },
              children: [{
                type: "div",
                attributes: {
                  class: "flex flex-col gap-8",
                },
                children: [{
                  type: "h1",
                  attributes: {
                    class: "text-4xl md:text-8xl",
                  },
                  children: [
                    {
                      type: "span",
                      attributes: { class: "whitespace-nowrap pr-4" },
                      children: ["🐳💨"],
                    },
                    {
                      type: "span",
                      attributes: {},
                      children: ["Gustwind"],
                    },
                  ],
                }, {
                  type: "h2",
                  attributes: {
                    class: "text-xl md:text-4xl font-extralight",
                  },
                  children: ["Deno powered website creator"],
                }],
              }],
            }],
          }, {
            type: "div",
            attributes: {
              class:
                "md:mx-auto my-8 px-4 md:px-0 w-full lg:max-w-3xl prose lg:prose-xl",
              "&children": "(get context readme.content)",
            },
            children: [],
          }],
        },
      ],
    }],
  );
});
