# HTMLisp

HTMLisp is a light extension of HTML meant for templating. In other words, HTMLisp accepts a context, allows binding it, and supports basic features, such as iteration. All the features have been implemented using as HTML attribute extensions meaning HTML-oriented tooling works well with HTMLisp out of the box. HTMLisp is the default option for templating in Gustwind although technically you could bring your own solution.

I've listed the main features below:

* Support for data binding from global context or props
* Named components - these allow reuse of markup and building your own abstractions that compile to HTML
* Iteration - to allow expanding arrays into more complex markup, such as a list, iteration is supported
* Visibility control - hiding entire portions of markup is possible
* Noop fragments - for some cases it makes sense to execute logic without emitting an element directly (i.e., iterating without emitting a parent element)
* `eval` free - to support execution in environments without support for JavaScript `eval` the solution does not rely on `eval`

## Expressions

If you understand how Lisp evaluation works, then you understand how Gustwind templating works. To give a concrete example, consider the component example below:

```html
<div>
  <SiteLink
    &children="(get props title)"
    &href="(urlJoin blog (get props slug))"
  />
</div>
```

That `(get props title)` expression should be read as `get('props', 'title')` call. Note the `&` before the attribute name as that signifies an expression binding.

The latter binding illustrates how expressions can be nested and `(concat blog / (get props slug))` can be read as `concat('blog', '/' , get('props', 'slug'))`.

## Iteration

To allow iteration over data, there is a specific `&foreach` syntax as shown below:

```html
<ul &foreach="(get context blogPosts)">
  <li class="inline">
    <SiteLink
      &children="(get props title)"
      &href="(urlJoin blog (get props slug))"
    />
  </li>
</ul>
```

The idea is that the expression given to `&foreach` generates an array that is then iterated through. In case the array contains pure values (i.e., strings, numbers etc.), those are exposed through `value` property that you can access through `(get props value)` within the `&foreach` block.

## Visibility

Given there are times when you might want to remove a part of the DOM structure based on an expression, there is `&visibleIf` helper that works as below:

```html
<body>
  <MainNavigation />
  <aside
    &visibleIf="(get props showToc)"
    class="fixed top-16 pl-4 hidden lg:inline"
  >
    <TableOfContents />
  </aside>
  <main &children="(get props content)"></main>
  <MainFooter />
  <Scripts />
</body>
```

When `showToc` evaluates as `false`, `aside` element is removed completely from the structure.

## Noop

Given there are times when you might want to perform an operation but not generate markup directly, there's a `noop` helper. Technically this is comparable to React fragments and it works as below:

**Do nothing**

```html
<noop />
```

**Iterate without generating a parent element**

```html
<noop &foreach="(get context scripts)">
  <script &type="(get props type)" &src="(get props src)"></script>
</noop>
```

**Replace type based on a given prop**

```html
<noop
  &type="(get props type)"
  &class="(get props class)"
  &children="(processMarkdown (get props children))"
></noop>
```

## Comments

There is a commenting syntax that allows documenting and gets removed through processing:

```html
<div __reference="https://gustwind.js.org/">Site creator</div>
```

## Components

Within components, `props` field is available within the context. On a high level it is comparable to how React and other libraries work so that components can encapsulate specific functionality and may be reused across projects easily.

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
