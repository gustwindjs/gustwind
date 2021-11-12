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
deno install -A --unstable --no-check -f https://deno.land/x/gustwind/cli.ts
```

The APIs are also available as modules if you need more control.

It's a good idea to use a recent version of [Deno](https://deno.land/) and I recommend using 1.16.0 or newer.

## Deployment

Gustwind sites can be deployed to any static host. The most difficult is building the site and you can either push this problem to a CI provider or build at the host itself. In either case you have to take care to install Deno as it's not often available given it's still a relatively new technology.

### Netlify

To configure Netlify, set up a file as follows.

**netlify.toml**

```yaml
[build]
  base    = ""
  publish = "build"
  command = "curl -fsSL https://deno.land/x/install/install.sh | sh -s v1.16.0 && /opt/buildhome/.deno/bin/deno run -A --unstable --no-check https://deno.land/x/gustwind@${VERSION}/cli.ts -b"
```

Remember to replace `VERSION` with the version of Gustwind you prefer to use!

### Vercel

For Vercel, [see Aleph.js deployment instructions](https://alephjs.org/docs/deployment) and replace the build command with `deno run -A --unstable --no-check https://deno.land/x/gustwind@${VERSION}/cli.ts -b`

Remember to replace `VERSION` with Gustwind version!

## Earlier related work

* [Tailspin](https://github.com/survivejs/tailspin) was an experimental site generator built with partially the same technology. In this project, the ideas have been largely re-implemented and taken further. In some ways Tailspin went further, though, as it implemented component level introspection (types) and editors while allowing JSX syntax.
* [Antwar](https://antwar.js.org/) was a React based static site generator. The experiences with Antwar over years have been put to good use in this project.

## Development

Run the available commands through [velociraptor](https://github.com/umbopepato/velociraptor) (vr).

Publishing goes through the [publish](https://deno.land/x/publish) utility.
