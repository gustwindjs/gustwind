# gustwind - Experimental Gustwind API for Node.js

This is an experimental API meant to be consumed through Node.js. The main use case for now has to do with edge-style and worker-style deployment targets that already support Node.js without an extra compatibility layer.

The Node path now includes:

- a render entrypoint
- a static build entrypoint
- a Node CLI for build, develop, and serve workflows
- a Vite-backed Node development server
- a Node static server for built output directories

The Node development path intentionally favors a simpler Vite full-reload workflow over preserving the older custom watcher and websocket stack.

## Install

Requires Node.js 24 or newer.

```bash
npm install gustwind
```

## Use

Run the packaged CLI:

```bash
npx gustwind --help
```

Consume the Node API:

```js
import { buildNode, initNodeRender, validateHtmlDirectory } from "gustwind";
```

Consume packaged plugins:

```js
import { plugin as htmlispRendererPlugin } from "gustwind/plugins/htmlisp-renderer";
import { plugin as scriptPlugin } from "gustwind/plugins/script";
import { plugin as tailwindPlugin } from "gustwind/plugins/tailwind";
```

Consume the packaged routers:

```js
import { plugin as configRouterPlugin } from "gustwind/routers/config-router";
import { plugin as edgeRouterPlugin } from "gustwind/routers/edge-router";
```

Consume lower-level htmlisp helpers:

```js
import {
  astToHTMLSync,
  blocks,
  cites,
  doubles,
  el,
  htmlispToHTMLSync,
  lists,
  parseBibtexCollection,
  parseLatex,
  refs,
  singles,
} from "gustwind/htmlisp";
```

They are also available as narrower subpath exports such as
`gustwind/htmlisp/parsers/latex/parseLatex`.

Component utilities receive the evaluated expression parameters. If a utility is
called with a component props object, foreach input is exposed through
`props.value`; utilities that support migrated Deno projects can accept either a
raw string or `{ value: string }`.

Projects migrating from the old Deno Twind plugin should use the packaged
Tailwind plugin:

```js
import { plugin as tailwindPlugin } from "gustwind/plugins/tailwind";
```

The Tailwind plugin expects a CSS entry file and a Tailwind setup module.

Deploy to Cloudflare Workers with the packaged adapter:

```js
import { createCloudflareWorker } from "gustwind/workers/cloudflare";
import { plugin as metaPlugin } from "gustwind/plugins/meta";
import { plugin as edgeRendererPlugin } from "gustwind/plugins/htmlisp-edge-renderer";
import { plugin as edgeRouterPlugin } from "gustwind/routers/edge-router";

export default createCloudflareWorker({
  initialPlugins: [
    [edgeRouterPlugin, { routes: { "/": { layout: "Home" } } }],
    [metaPlugin, { meta: { title: "Home" } }],
    [edgeRendererPlugin, {
      components: { Home: "<html><body><h1 &children=\"meta.title\"></h1></body></html>" },
      componentUtilities: {},
      globalUtilities: { init: () => ({}) },
    }],
  ],
});
```
