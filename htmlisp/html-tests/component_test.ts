import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("basic component", () => {
  assertEquals(
    htmlispToHTML("<Button>foo</Button>", {
      Button: '<button &children="(get props children)"></button>',
    }),
    "<button>foo</button>",
  );
});

Deno.test("throws if a component is not found", () => {
  assertThrows(
    () => htmlispToHTML("<Button>foo</Button>"),
    Error,
    `Component "Button" was not found!`,
  );
});

Deno.test("component with attributes", () => {
  assertEquals(
    htmlispToHTML(`<Button title="demo">foo</Button>`, {
      Button:
        '<button &children="(get props children)" &title="(get props title)"></button>',
    }),
    `<button title="demo">foo</button>`,
  );
});

Deno.test("component with children", () => {
  assertEquals(
    htmlispToHTML(`<Button><div>foo</div></Button>`, {
      Button: '<button &children="(get props children)"></button>',
    }),
    "<button><div>foo</div></button>",
  );
});

Deno.test("component with children attributes", () => {
  assertEquals(
    htmlispToHTML(`<Button &children="foo"></Button>`, {
      Button: '<button &children="(get props children)"></button>',
    }),
    "<button>foo</button>",
  );
});

/*
Deno.test("component with multiple children", () => {
  assertEquals(
    htmlispToHTML(`<Button><div>foo</div><div>bar</div></Button>`),
    {
      type: "Button",
      children: [
        { type: "div", children: "foo", attributes: {} },
        { type: "div", children: "bar", attributes: {} },
      ],
      props: {},
    },
  );
});

Deno.test("component with an expression", () => {
  assertEquals(
    htmlispToHTML(
      `<Link
        &href="(get context document.content)"
      ></Link>`,
    ),
    {
      type: "Link",
      children: [],
      bindToProps: {
        href: {
          utility: "get",
          parameters: ["context", "document.content"],
        },
      },
      props: {},
    },
  );
});

Deno.test("component with a children expression", () => {
  assertEquals(
    htmlispToHTML(
      `<Markdown
        type="div"
        &children="(get context document.content)"
      ></Markdown>`,
    ),
    {
      type: "Markdown",
      children: [],
      props: {
        type: "div",
      },
      bindToProps: {
        children: {
          utility: "get",
          parameters: ["context", "document.content"],
        },
      },
    },
  );
});

Deno.test("component with a children expression 2", () => {
  assertEquals(
    htmlispToHTML(
      `<Heading level="2" class="text-4xl" &children="(get props name)" />`,
    ),
    {
      type: "Heading",
      children: [],
      props: {
        class: "text-4xl",
        level: "2",
      },
      bindToProps: {
        children: {
          utility: "get",
          parameters: ["props", "name"],
        },
      },
    },
  );
});
*/
