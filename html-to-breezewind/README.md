# Templating

In Gustwind, templating is handled as a combination of standard HTML and several non-standard extensions that have been described in detail below. Technically the syntax is converted to [Breezewind](/breezewind) syntax underneath and the syntax exists to make authoring Gustwind sites faster and easier as most of the time you can copy and paste existing HTML to your project.

## Expressions

If you understand how Lisp works, then you understand how Gustwind templating works. To give a concrete example, consider the component example below:

```html
<div>
  <SiteLink
    &children="(get props data.title)"
    &href="(urlJoin blog / (get props data.slug))"
  />
</div>
```

That `(get props data.title)` expression should be read as `get('props', 'data.title'` call. Note the `&` before the attribute name as that signifies an expression binding.

The latter binding illustrates how expressions can be nested and `(concat blog / (get props data.slug))` can be read as `concat('blog', '/' , get('props', 'data.slug'))`.

## Loops

To allow looping over data, there is a specific `&foreach` syntax as shown below:

```html
<ul &foreach="(get context blogPosts)">
  <li class="inline">
    <SiteLink
      &children="(get props data.title)"
      &href="(urlJoin blog / (get props data.slug))"
    />
  </li>
</ul>
```

The idea is that the expression given to `&foreach` generates an array that is then iterated through.

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
  <main &children="(render (get props content))"></main>
  <MainFooter />
  <Scripts />
</body>
```

When `showToc` evaluates as `false`, `aside` element is removed completely from the structure.

## Class list helper

To allow construction of complex classes, there is a `&class[]` helper that works as below:

```html
<a
  &class[0]="(id underline)"
  &class[1]="(pick (equals (get props href) (trim (get context pagePath) /)) font-bold)"
  &href="(validateUrl (get props href))"
  &children="(render (get props children))"
/>
```

Due to technical restrictions, you have to pass indices to the class array. Underneath the evaluated classes are compiled as a single `class` attribute.

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

## Components

Within components, `props` field is available within the context. [Check Breezewind](/breezewind) to understand this functionality better. On a high level it is comparable to how React and other libraries work so that components can encapsulate specific functionality and may be reused across projects easily.

## Playground

Use the playground below to experiment with the syntax and see how it converts to Breezewind:

:TemplatingPlayground:

## License

MIT.
