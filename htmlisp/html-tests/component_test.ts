import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTML } from "../mod.ts";

test("basic component", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: "<Button>foo</Button>",
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button>foo</button>",
  );
});

test("basic component with simple html input", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: "<Button><span>foo</span></Button>",
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button><span>foo</span></button>",
  );
});

test("basic component with html input in between with whitespaces", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: "<Button>foo <span>foo</span> foo</Button>",
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button>foo <span>foo</span> foo</button>",
  );
});

test("basic component with complex html input", async () => {
  const input =
    `<a class="#1utjbpi" href="http://cssinjs.org/plugins">Plugin API</a>`;

  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<Button>${input}</Button>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    `<button>${input}</button>`,
  );
});

test("complex component with complex html input", async () => {
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

  assert.deepEqual(
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

test("component with a flag", async () => {
  assert.deepEqual(
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

test("basic component 2", async () => {
  assert.deepEqual(
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

test("throws if a component is not found", async () => {
  await assert.rejects(
    () => htmlispToHTML({ htmlInput: "<Button>foo</Button>" }),
    Error,
    `Component "Button" was not found!`,
  );
});

test("component with attributes", async () => {
  assert.deepEqual(
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

test("component with children", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<Button><div>foo</div></Button>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button><div>foo</div></button>",
  );
});

test("component with children attributes", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<Button children="foo"></Button>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button>foo</button>",
  );
});

test("component with multiple children", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<Button><div>foo</div><div>bar</div></Button>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
    }),
    "<button><div>foo</div><div>bar</div></button>",
  );
});

test("component with an expression", async () => {
  assert.deepEqual(
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

test("component with a children expression", async () => {
  assert.deepEqual(
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

test("passed attributes do not get removed", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: "<Button title>foo</Button>",
      components: {
        Button:
          '<button &children="(get props children)" &title=(get props title)></button>',
      },
    }),
    "<button title>foo</button>",
  );
});

test("attributes receiving null get removed", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: "<Button>foo</Button>",
      components: {
        Button:
          '<button &children="(get props children)" &title=(get props title)></button>',
      },
    }),
    "<button>foo</button>",
  );
});
