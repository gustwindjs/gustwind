# Gustwind

Gustwind is a [Deno](https://deno.land/) powered website creator that allows component oriented development of large scale sites. Conceptually it's split as follows:

* **Development mode** lets you preview the site and modify page definitions to commit later
* **Production mode** generates pure static HTML with CSS inlined to the files
* **Components** defined with a JSON or HTML based component abstraction included allow you to extract shared markup and bind data to it
* **Data sources** define how your data is fetched. At page level, it can then be connected and bound to components.
* **Route definition** binds it all together.

Please see the documentation to learn more about the concepts.

## Getting started

There's [a simple GitHub template](https://github.com/gustwindjs/gustwind-template) that has basic features set up. It renders the project readme as `index.html` and you should expand/change the project to your liking.

## Usage

The easiest way to consume the project is to use the CLI:

```bash
deno install -A --unstable --no-check -f https://deno.land/x/gustwind/gustwind-cli/mod.ts
```

The APIs are also available as modules if you need more control.

It's a good idea to use a recent version of [Deno](https://deno.land/) and I recommend using 1.16.0 or newer.


## Data flow

Gustwind accepts TypeScript, Markdown, JSON or HTML definitions including Twind (Tailwind) classes and emits HTML and JavaScript.

![Gustwind data flow](./assets/gustwind-flow.svg)

It's possible to customize the input formats and it can load data from asynchronous sources, say GraphQL APIs, so it can be used with headless content APIs.

## Example sites

Given Gustwind is still in a rapid development phase, the APIs change every once in a while. The [source of this site](https://github.com/gustwindjs/gustwind) is the most up to date resource and I've listed other examples below:

* [jster.net](https://jster.net/) - [Source](https://github.com/jsterlibs/website-v2)
* [sidewind.js.org](https://sidewind.js.org/) - [Source](https://github.com/survivejs/sidewind)
* [dragjs](http://bebraw.github.io/dragjs/) - [Source](https://github.com/bebraw/dragjs)
* [Future Frontend](https://futurefrontend.com/) - [Source](https://github.com/ReactFinland/future-frontend-site)

## Availability through Deno

Please use [x/gustwind](https://deno.land/x/gustwind) to access the tool through Deno Land.

## Earlier related work

* [Tailspin](https://github.com/survivejs/tailspin) was an experimental site generator built with partially the same technology. In this project, the ideas have been largely re-implemented and taken further. In some ways Tailspin went further, though, as it implemented component level introspection (types) and editors while allowing JSX syntax.
* [Antwar](https://antwar.js.org/) was a React based static site generator. The experiences with Antwar over years have been put to good use in this project.

## Development

Use `deno task` to see available tasks and to run them.

To test the cli locally, use `deno install --no-check -A -f --unstable -n gustwind ./gustwind-cli/mod.ts`. A symlink would likely work as well.

## Publishing to deno.land

Publishing to deno.land goes through the [publish](https://deno.land/x/publish) utility.

## Publishing to npm

1. `deno task build:gustwind-for-npm <VERSION>` where `VERSION` is `0.1.0` for example
2. `cd gustwind/npm`
3. `npm publish`. You may need to pass `--otp` here as well (preferred for security)
