import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("basic component", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: "<Button>foo</Button>",
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button>foo</button>",
  );
});

Deno.test("throws if a component is not found", () => {
  assertRejects(
    async () => await htmlispToHTML({ htmlInput: "<Button>foo</Button>" }),
    Error,
    `Component "Button" was not found!`,
  );
});

Deno.test("component with attributes", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Button title="demo">foo</Button>`,
      components: {
        Button:
          '<button &children="(get props children)" &title="(get props title)"></button>',
      },
    }),
    `<button title="demo">foo</button>`,
  );
});

Deno.test("component with children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Button><div>foo</div></Button>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button><div>foo</div></button>",
  );
});

Deno.test("component with children attributes", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Button &children="foo"></Button>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button>foo</button>",
  );
});

Deno.test("component with multiple children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Button><div>foo</div><div>bar</div></Button>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button><div>foo</div><div>bar</div></button>",
  );
});

Deno.test("component with an expression", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Link &href="(get context demo)"></Link>`,
      components: {
        Link: '<a &href="(get props href)"></a>',
      },
      context: {
        demo: "foobar",
      },
    }),
    `<a href="foobar"></a>`,
  );
});

Deno.test("component with a children expression", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Markdown &children="(get context demo)"></Markdown>`,
      components: {
        Markdown: '<div &children="(get props children)"></div>',
      },
      context: {
        demo: "foobar",
      },
    }),
    `<div>foobar</div>`,
  );
});
