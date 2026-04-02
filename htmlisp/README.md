# HTMLisp

HTMLisp is a light extension of HTML meant for templating. In other words, HTMLisp accepts a context, allows binding it, and supports basic features, such as iteration. All the features have been implemented using as HTML attribute extensions meaning HTML-oriented tooling works well with HTMLisp out of the box. HTMLisp is the default option for templating in Gustwind although technically you could bring your own solution.

I've listed the main features below:

* Support for data binding from global context or props
* Scoped shorthand lookup inside expression bindings
* Named components - these allow reuse of markup and building your own abstractions that compile to HTML
* Function components in addition to string components
* Iteration - to allow expanding arrays into more complex markup, such as a list, iteration is supported
* Visibility control - hiding entire portions of markup is possible
* `fragment` and `noop` helpers - for cases where you want logic or composition without emitting a parent element
* Structured attributes through `&attrs`
* Optional escaped-by-default output with explicit raw HTML
* `eval` free - to support execution in environments without support for JavaScript `eval` the solution does not rely on `eval`

## Expressions

If you understand how Lisp evaluation works, then you understand how Gustwind templating works. To give a concrete example, consider the component example below:

```html
<div>
  <SiteLink
    &children="title"
    &href="(urlJoin blog slug)"
  />
</div>
```

Note the `&` before the attribute name as that signifies an expression binding.

HTMLisp supports two styles inside those bindings:

**Lisp-style utility calls**

```html
<a &href="(urlJoin blog (get props slug))"></a>
```

**Scoped shorthand lookup**

```html
<a &href="post.slug" &children="message"></a>
```

Shorthand lookup resolves in this order:

1. `local`
2. `props`
3. `context`

That means `message` will read from local loop or `noop` scope first, then from component props, and finally from global rendering context.

The Lisp-style form remains fully supported and is still useful when you want utility calls or explicit lookups.

## Escaping And Raw HTML

HTMLisp can now run in an escaped-by-default mode:

```ts
import { htmlispToHTML, raw } from "htmlisp";

await htmlispToHTML({
  htmlInput: `<div &children="message"></div>`,
  props: { message: "<em>unsafe</em>" },
  renderOptions: { escapeByDefault: true },
});
```

That renders:

```html
<div>&lt;em&gt;unsafe&lt;/em&gt;</div>
```

When you want to inject trusted HTML explicitly, use `raw(...)`:

```html
<div &children="(raw summaryHtml)"></div>
```

or pass a raw value from TypeScript:

```ts
raw("<strong>trusted</strong>");
```

This keeps the dangerous path explicit while allowing normal strings to remain safe.

## Iteration

To allow iteration over data, there is a specific `&foreach` syntax as shown below:

```html
<ul &foreach="blogPosts">
  <li class="inline">
    <SiteLink
      &children="title"
      &href="(urlJoin blog slug)"
    />
  </li>
</ul>
```

The expression given to `&foreach` should produce an array. For each item, object fields are merged into the current `props` scope. In case the array contains pure values such as strings or numbers, those are exposed through `value`.

```html
<ul &foreach="blogPosts">
  <li &children="value"></li>
</ul>
```

## Visibility

Given there are times when you might want to remove a part of the DOM structure based on an expression, there is `&visibleIf` helper that works as below:

```html
<body>
  <MainNavigation />
  <aside
    &visibleIf="showToc"
    class="fixed top-16 pl-4 hidden lg:inline"
  >
    <TableOfContents />
  </aside>
  <main &children="content"></main>
  <MainFooter />
  <Scripts />
</body>
```

When `showToc` evaluates as `false`, `aside` element is removed completely from the structure.

## Fragment And Noop

Use `fragment` when you want composition without wrapper markup:

```html
<fragment>
  <Button />
  <Button />
</fragment>
```

or:

```html
<fragment &children="submitButton"></fragment>
```

Given there are also cases where you want to perform an operation but not generate markup directly, `noop` still exists. It remains useful for advanced cases such as local bindings and dynamic tag replacement.

**Do nothing**

```html
<noop />
```

**Iterate without generating a parent element**

```html
<noop &foreach="scripts">
  <script &type="type" &src="src"></script>
</noop>
```

**Replace type based on a given prop**

```html
<noop
  &type="type"
  &class="class"
  &children="(processMarkdown children)"
></noop>
```

As a rule of thumb:

* use `fragment` for plain composition
* use `noop` when you need its local-binding or dynamic-type behavior

## Comments

There is a commenting syntax that allows documenting and gets removed through processing:

```html
<div __reference="https://gustwind.js.org/">Site creator</div>
```

## Components

Within components, `props` field is available within the context. On a high level it is comparable to how React and other libraries work so that components can encapsulate specific functionality and may be reused across projects easily.

HTMLisp supports both string components and function components.

**String components**

```ts
const components = {
  Button: `<button &children="children"></button>`,
};
```

**Function components**

```ts
const components = {
  Button: (props) => `<button>${props.children}</button>`,
};
```

Function components are useful when you want TypeScript-level authoring and typing instead of large inline template strings.

The async renderer accepts async component functions. The sync renderer accepts sync component functions only.

## Structured Attributes

For helper components that need to pass through normal HTML attributes, use `&attrs`:

```html
<button
  &type="type"
  &class="className"
  &attrs="extraAttributes"
  &children="label"
></button>
```

Attribute map behavior is:

* string values become escaped attributes
* `true` becomes a boolean attribute
* `false`, `null`, and `undefined` are omitted
* explicit attributes win over values coming from `&attrs`

## Slots

To make it convenient to construct complex components that accept structures from the consumer, there is support for slots as below:

```html
<BaseLayout>
  <slot name="content">Main content goes here</slot>
  <slot name="aside"><TableOfContents /></slot>
</BaseLayout>
```

Internally slots map to `props`. The main benefit is that they allow expression of complex element structures without having to go through an attribute.

## Playground

Use the playground below to experiment with the syntax and see how it converts to HTML:

:TemplatingPlayground:

> Note that this playground works only on [Gustwind website](https://gustwind.js.org/templating/).

## License

MIT.
