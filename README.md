Gustwind is an experimental site generator built on top of JSON definitions using [Deno](https://deno.land/), [Twind](https://twind.dev/), and [Sidewind](https://sidewind.js.org/). The goal of the design is to allow component oriented development of large scale sites (more than thousands of pages). Conceptually it's split as follows:

* **Development mode** lets you preview the site and modify page definitions to commit later
* **Production mode** generates pure static HTML with CSS inlined to the files
* **Components** defined with a JSON based component abstraction included allow you to extract shared markup and bind data to it
* **Data sources** define how your data is fetched. At page level, it can then be connected and bound to components
* **Transforms** let you alter data to fit the current need. You can use them for example convert Markdown input to HTML or reverse the order of an array to generate a blog index in a specific order.
* **Pages** based on the JSON page definitions describe the site and use the concepts above to compose your site

Please see the documentation to learn more about the concepts.

## Usage

The easiest way to consume the project is to use the CLI:

```bash
deno install --allow-env --allow-read=. --allow-write=. --allow-net=deno.land,esm.sh,cdn.skypack.dev,registry.npmjs.org --no-check https://deno.land/x/gustwind@v0.7.3/cli.ts
```

The APIs are also available as modules if you need more control.

It's a good idea to use a recent version of [Deno](https://deno.land/) and I recommend using 1.16.0 or newer.

## Earlier related work

* [Tailspin](https://github.com/survivejs/tailspin) was an experimental site generator built with partially the same technology. In this project, the ideas have been largely re-implemented and taken further. In some ways Tailspin went further, though, as it implemented component level introspection (types) and editors while allowing JSX syntax.
* [Antwar](https://antwar.js.org/) was a React based static site generator. The experiences with Antwar over years have been put to good use in this project.

## Development

Run the available commands through [velociraptor](https://github.com/umbopepato/velociraptor) (vr).
