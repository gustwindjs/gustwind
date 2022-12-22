# Breezewind - Breezing fast templating

Breezewind is a templating engine (JSON to HTML/XML) designed with the following considerations in mind:

* Performance - It's doing only bare minimum
* Extensibility - There's a way to write your own syntax extensions on top of the core and it ships with a few
* `eval` free - To allow execution in environments, such as CloudFlare Workers, it doesn't rely on `eval` or related techniques for logic

## Installation

Breezewind is available through [npm](https://www.npmjs.com/package/breezewind) or [deno.land](https://deno.land/x/gustwind). It's coupled to Gustwind releases at deno.land as I don't know yet how to publish both from a monorepo.

## Usage

The following example illustrates how to use the API to render a link:

```typescript
import breeze from "breezewind";

breeze({
  component: {
    type: "a",
    attributes: {
      href: "https://gustwind.js.org/",
      title: "Gustwind",
    },
    children: "Link to Gustwind",
  },
  components: {},
  context: {},
  extensions: [],
  utilities: {},
});
```

### Components

Components allow React-style composition. In other words, they let you extract functionality that's shared and reuse it. Consider the following example:

```typescript
import breeze from "breezewind";

breeze({
  component: {
    type: "Link",
    props: {
      href: "https://gustwind.js.org/",
      title: "Gustwind",
      children: "Link to Gustwind",
    },
  },
  components: {
    Link: {
      type: "a",
      attributes: {
        href: { utility: "get", parameters: ["props", "href"]},
        title: { utility: "get", parameters: ["props", "title"]},
      },
      children: { utility: "get", parameters: ["props", "children"]},
    }
  },
  context: {},
  extensions: [],
  utilities: {},
});
```

Note that you can apply utilities within `props` as well to dig data from components props or global context.

### Utilities

To work around the limitation of not having access to `eval` based techniques, Gustwind relies on a simple programming model based on function invocations. In the example below, `{ utility: "get", parameters: ["props", "href"]}` was an example of this.

On top of this, it's possible to apply functions within parameters recursively. For example, you could concatenate to a url like this:

```typescript
const concatenatedAttribute = {
  utility: "concat",
  parameters: [
    {
      utility: "get",
      parameters: ["props", "data.slug"]
    },
    "/"
  ]
};
```

The following utilities are provided out of the box:

* `get(<context>, <selector>, <defaultValue>)` tries to get with `selector` from `context`. If this process fails, `defaultValue` is returned instead.
* `concat(...<string>)` concatenates given strings into a single string.
* `stringify(input: unknown)` applies `JSON.stringify(input, null, 2)`. Useful for debugging.

To implement your own, follow this signature: `(_: Context, ...parts: string[]) => string | Promise<string>`. Technically you don't have to return a string but in that case you have to be aware of the consequences and design your utilities accordingly.

To pass custom utilities to Breezewind, do the following:

```typescript
import breeze from "breezewind";

breeze({
  component: {
    type: "Link",
    // Since we want to apply a utility, we have to use bindToProps.
    // This way the system knows what you want to preserve as an object.
    bindToProps: {
      children: { utility: "hello", parameters: ["hello"] },
    },
    props: {
      href: "https://gustwind.js.org/",
      title: "Gustwind",
    },
  },
  components: { ... },
  context: {},
  extensions: [],
  utilities: {
    hello: (_, input: string) => input + ' ' + 'world!',
  },
});
```

To detect when rendering has started and ended (useful for instrumentation), you can use `_onRenderStart(context: Context)` and `_onRenderEnd(context: Context)`. Each triggers once during the rendering process.

### Context

To allow injecting data from outside to templates, Breezewind implements a global context. Use it like this:

```typescript
import breeze from "breezewind";

breeze({
  component: {
    type: "Link",
    props: {
      href: "https://gustwind.js.org/",
      title: "Gustwind",
      children: { utility: "hello", parameters: [{
        // Note the access here!
        utility: "get", parameters: ["context", "hello"]
      }] },
    },
  },
  components: { ...},
  context: {
    hello: "hello",
  },
  extensions: [],
  utilities: {
    hello: (_, input: string) => input + ' ' + 'world!',
  },
});
```

You have access to the context anywhere and it's comparable to the concept in React and other templating engines.

### Extensions

Currently four official extensions are supported:

* `classShortcut((input: string) => (output: string))` provides a `class` shortcut (maps given input to a `class` attribute) and `classList` shortcut for toggling classes based on truths. Note that unlike the other extensions, this one is a factory accepting a function transforming the given class (useful with Tailwind or Twind for example).
* `foreach` gives access to iteration allowing mapping arrays to flat structures.
* `inject(e => ({ ...e, attributes: { ...c.attributes, "data-id": "demo" }}))` lets you inject a property to each node within a JSON tree. This is useful for injecting test ids for example.
* `visibleIf` makes it possible to remove nodes from the tree based on an array of statements.

To activate extensions, do the following:

```typescript
import { tw } from "twind";
import breeze from "breezewind";
import extensions from "breezewind/extensions";

breeze({
  component: {
    visibleIf: [{ utility: "get", parameters: ["context", "pagePath"] }],
    type: "a",
    class: "underline",
    classList: {
      "font-bold": [
        "gustwind.js.org",
        { utility: "get", parameters: ["context", "pagePath"] }
      ]
    },
    attributes: {
      href: "https://gustwind.js.org/",
      title: "Gustwind",
    },
    children: "Link to Gustwind",
  },
  components: { ... },
  context: { pagePath: "gustwind.js.org" },
  extensions: [
    extensions.visibleIf,
    extensions.classShortcut(tw),
    extensions.foreach,
  ],
  utilities: {},
});
```

### Rendering a doctype

To render a doctype, set `closingCharacter` to `""` to avoid the default behavior that generates full tags:

```typescript
import breeze from "breezewind";

breeze({
  component: {
    type: "!DOCTYPE",
    attributes: {
      html: "",
      language: "en",
    },
    closingCharacter: "",
  },
  ...
});
```

### Typing

To access types, use the following kind of syntax:

```typescript
import breeze, { type Component } from "breezewind";

...
```

## Playground

Use the playground below to experiment with the syntax:

:Playground:

## Publishing to npm

1. `deno task build:breezewind-for-npm <VERSION>` where `VERSION` is `0.1.0` for example
2. `cd breezewind/npm`
3. `npm publish`. You may need to pass `--otp` here as well (preferred for security)

## License

MIT.
