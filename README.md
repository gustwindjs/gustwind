# Gustwind

Gustwind is a [Deno](https://deno.land/)-powered website creator that allows component-oriented development of large-scale sites using HTMLisp, a variant of HTML. Conceptually, it is split as follows:

* **Development mode** lets you preview the site and modify page definitions to commit later
* **Production mode** generates pure static HTML with CSS inlined to the files
* **HTMLisp** is the default option for [templating]{/templating/} and component definitions, although it can be replaced with another plugin
* **Data sources** define how information is brought to a site
* **Route definition** binds it all together and allows connecting data sources to specific routes

Please see the documentation to learn more about the concepts.

## Getting started

There is [a simple GitHub template](https://github.com/gustwindjs/gustwind-template) that has basic features set up. It renders the project readme as `index.html`, and you should expand/change the project to your liking.

## Data flow

Gustwind accepts TypeScript, Markdown, and HTMLisp definitions. Then the build process emits HTML and JavaScript. Note that you can replace many aspects of the system by using plugins to fit your requirements. The image below describes the basic idea:

![Gustwind data flow](./assets/gustwind-flow.svg)

It's possible to customize the input formats and it can load data from asynchronous sources, say GraphQL APIs, so Gustwind can be used with headless content APIs.

## Example sites

Given Gustwind is still in a rapid development phase, the APIs change every once in a while. The [source of this site](https://github.com/gustwindjs/gustwind) is the most up to date resource, and I've listed other examples below:

* [jster.net](https://jster.net/) - [Source](https://github.com/jsterlibs/website-v2)
* [sidewind.js.org](https://sidewind.js.org/) - [Source](https://github.com/survivejs/sidewind)
* [dragjs](http://bebraw.github.io/dragjs/) - [Source](https://github.com/bebraw/dragjs)
* [Future Frontend](https://futurefrontend.com/) - [Source](https://github.com/ReactFinland/future-frontend-site)
* [SurviveJS](https://survivejs.com) - [Source](https://github.com/survivejs/website-v3)

## Earlier related work

* [Tailspin](https://github.com/survivejs/tailspin) was an experimental site generator built with partially the same technology. In this project, the ideas have been largely re-implemented and taken further. In some ways, Tailspin went further, though, as it implemented component level introspection (types) and editors while allowing JSX syntax.
* [Antwar](https://antwar.js.org/) was a React-based static site generator. The experiences with Antwar over years, have been put to good use in this project.
