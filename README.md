# Gustwind

Gustwind is a Node.js-powered website creator that allows component-oriented development of large-scale sites using HTMLisp, a variant of HTML. Conceptually, it is split as follows:

* **Development mode** lets you preview the site and modify page definitions to commit later
* **Production mode** generates pure static HTML with CSS inlined to the files
* **HTMLisp** is the default option for [templating](https://gustwind.js.org/templating/) and component definitions
* **Data sources** define how information is brought to a site
* **Route definition** binds it all together and allows connecting data sources to specific routes
* **Plugin system** allows replacing any part of the system to fit custom requirements
* **Integrated HTML validation** catches malformed HTML in built output before deployment

Please see the documentation to learn more about the concepts.

## Getting started

There is [a simple GitHub template](https://github.com/gustwindjs/gustwind-template) that has basic features set up. It renders the project readme as `index.html`, and you should expand/change the project to your liking.

## Data flow

Gustwind accepts TypeScript, Markdown, and HTMLisp definitions. Then, the build process emits HTML and JavaScript. Note that you can replace many aspects of the system by using plugins to fit your requirements. The image below describes the basic idea:

![Gustwind data flow](./assets/gustwind-flow.svg)

It's possible to customize the input formats and it can load data from asynchronous sources, say GraphQL APIs, so Gustwind can be used with headless content APIs.

## Server-Side Rendering (SSR)

Although Gustwind was designed mainly with Static Site Generation (SSG) in mind, portions of it can be used in a server environment. There's for example a simplified version of the router designed for this purpose, and the default templating solution works both in server and client as it is light by design.

## HTML validation

Gustwind exposes HTML validation directly through its Node integration. Use `gustwind --validate --input ./build` to validate an existing build, or `gustwind --build --validate` to make validation part of the build itself.

The same capability is also available through the published Node API, so integrations built on top of Gustwind can validate generated output without shelling out to a separate tool.

## Example sites

Given Gustwind is still in a rapid development phase, the APIs change every once in a while. The [source of this site](https://github.com/gustwindjs/gustwind) is the most up to date resource, and I've listed other examples below:

* [jster.net](https://jster.net/) - [Source](https://github.com/jsterlibs/website-v2)
* [sidewind.js.org](https://sidewind.js.org/) - [Source](https://github.com/survivejs/sidewind)
* [dragjs](http://bebraw.github.io/dragjs/) - [Source](https://github.com/bebraw/dragjs)
* [Future Frontend](https://futurefrontend.com/) - [Source](https://github.com/ReactFinland/future-frontend-site)
* [SurviveJS](https://survivejs.com) - [Source](https://github.com/survivejs/website-v3)

## Performance

Gustwind can now emit structured build benchmark data through its Node CLI. Run `gustwind --benchmark` or `npm run benchmark:build` to build the site and write `benchmark-results.json` with total wall-clock build time, route count, per-route timings, percentile timings, and peak RSS memory usage.

The same metrics are available through `buildNode({ collectBenchmark: true, ... })` in the published Node API, so integrations can capture benchmark data without shelling out.

Production builds also reuse prior output by default. Each build now writes its incremental cache manifest to `build/.gustwind/build-cache.json`, so the cache can travel with the published site artifact itself.

When the previous build cache is still valid, `npm run build` rebuilds only the routes whose observed inputs changed and keeps unaffected route output in place. The cache now tracks layout and component dependencies separately, so changing a component only invalidates the routes that actually render through it instead of forcing a whole-site rebuild. Use `gustwind --build --cache-from ./previous-build` to import cached route output from another local build directory, or point `--cache-from` at a published site URL that exposes the same `/.gustwind/build-cache.json` file. Use `gustwind --build --no-incremental` if you want to force a fully fresh rebuild.

Production builds also render independent routes with bounded concurrency, so total build time measures end-to-end wall-clock time while individual route timings can overlap.

This repository now separates fast local builds from release builds. `npm run build` skips Pagefind indexing to keep first builds fast, while `npm run build:release` includes the search index and is the path used for deployment and browser tests.

Independent `prepareBuild` and `finishBuild` hooks now also run in dependency layers, so global plugin work like asset preparation and release-only finishing steps can overlap when they do not depend on each other.

That gives you a reproducible baseline for your own site instead of relying on generic claims. The current benchmark mode measures production builds; warm-cache runs and larger synthetic fixtures are still worth adding if you want tighter regression tracking over time.

Sample benchmark for this repository on April 13, 2026. These numbers are machine-dependent and should be treated as an example, not a guarantee:

| Metric | Sample |
| --- | ---: |
| Routes built | 14 |
| Total build time | 206.669 ms |
| Average route time | 26.698 ms |
| p50 route time | 12.426 ms |
| p95 route time | 59.364 ms |
| Peak RSS memory | 175.7 MB |
| Fastest route | `/routing/` in 1.999 ms |
| Slowest route | `/blog/more/` in 59.364 ms |

## Earlier related work

* [Tailspin](https://github.com/survivejs/tailspin) was an experimental site generator built with partially the same technology. In this project, the ideas have been largely re-implemented and taken further. In some ways, Tailspin went further, though, as it implemented component level introspection (types) and editors while allowing JSX syntax.
* [Antwar](https://antwar.js.org/) was a React-based static site generator. The experiences with Antwar over years, have been put to good use in this project.
