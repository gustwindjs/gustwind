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

Deno.test("basic component with simple html input", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: "<Button><span>foo</span></Button>",
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button><span>foo</span></button>",
  );
});

Deno.test("basic component with complex html input", async () => {
  const input =
    `<a class="#1utjbpi" href="http://cssinjs.org/plugins">Plugin API</a>`;

  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Button>${input}</Button>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    `<button>${input}</button>`,
  );
});

Deno.test("complex component with complex html input", async () => {
  const input =
    `<a class="#1utjbpi" href="http://cssinjs.org/plugins">Plugin API</a>`;
  const HeadingWithAnchor = `<noop
  &visibleIf="(get props children)"
  &type="(concat h (get props level))"
  &id="(get props anchor)"
>
  <div class="inline" &children="(get props children)" />
  <a &href="(concat # (get props anchor))">🔗</a>
</noop>
`;

  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<HeadingWithAnchor level="3" anchor="test">${input}</HeadingWithAnchor>`,
      components: {
        HeadingWithAnchor,
      },
    }),
    `<h3 id="test"><div class="inline">${input}</div><a href="#test">🔗</a></h3>`,
  );
});

Deno.test("component with a flag", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: "<Button showButton>foo</Button>",
      components: {
        Button:
          '<button &visibleIf="(get props showButton)" &children="(get props children)"></button>',
      },
    }),
    "<button>foo</button>",
  );
});

Deno.test("basic component 2", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<SiteLink href="modes">Modes</SiteLink>
<SiteLink href="configuration">Configuration</SiteLink>`,
      components: {
        SiteLink:
          '<a &href="(get props href)" &children="(get props children)"></a>',
      },
    }),
    `<a href="modes">Modes</a><a href="configuration">Configuration</a>`,
  );
});

Deno.test("throws if a component is not found", () => {
  assertRejects(
    () => htmlispToHTML({ htmlInput: "<Button>foo</Button>" }),
    Error,
    `Component "Button" was not found!`,
  );
});

Deno.test("component with attributes", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Button title="demo">foobar</Button>`,
      components: {
        Button:
          '<button &children="(get props children)" &title="(get props title)"></button>',
      },
    }),
    `<button title="demo">foobar</button>`,
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
      htmlInput: `<Button children="foo"></Button>`,
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
