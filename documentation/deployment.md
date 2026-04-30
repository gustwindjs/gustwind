---
slug: 'deployment'
title: 'Deployment'
description: 'Gustwind can be deployed to any static host'
---
Gustwind sites can be deployed to any static host. The most difficult part is building the site and you can either push this problem to a CI provider or build at the host itself. The preferred deployment path is now the Node.js build.

The general approach is to first set up a build script to install Node.js dependencies and run Gustwind like this:

**build.sh**

```bash
#!/usr/bin/env bash

npm ci
npm run build:release
```

Also make the file executable with `chmod +x` and point your CI environment to use the file when building. Usually there's a field for that in their user interface somewhere.

The benefit of using a simple script like this is that it lets you control versions of both Node.js and Gustwind. Gustwind is still a moving target, so pinning dependency versions in your lockfile is recommended. `npm run build` remains useful for a faster local build loop, but deployments should use `npm run build:release` so Pagefind search assets are generated.

## Netlify

To configure Netlify, set up a file as follows:

**netlify.toml**

[<file>](netlify.toml)

The related build command would install dependencies and run the Node build. Alternatively you can leverage `build.sh` as above.

## Vercel

For Vercel, point to `build.sh` through their user interface.

## Cloudflare Workers

For Worker deployments, Gustwind now exposes a Cloudflare adapter through `gustwind/workers/cloudflare`. It wraps the edge-compatible render path into a Worker `fetch()` handler and can optionally serve built assets from the standard `ASSETS` binding.

```js
import { createCloudflareWorker } from "gustwind/workers/cloudflare";
import { plugin as metaPlugin } from "gustwind/plugins/meta";
import { plugin as scriptPlugin } from "gustwind/plugins/script";
import { plugin as edgeRendererPlugin } from "gustwind/plugins/htmlisp-edge-renderer";
import { plugin as edgeRouterPlugin } from "gustwind/routers/edge-router";
import scriptAssets from "./build/.gustwind/script-assets.json" with { type: "json" };

export default createCloudflareWorker({
  initialPlugins: [
    [edgeRouterPlugin, {
      routes: {
        "/": {
          layout: "Home",
          context: { headline: "Hello from Gustwind" },
        },
      },
    }],
    [metaPlugin, { meta: { title: "Cloudflare Worker" } }],
    [scriptPlugin, { scriptAssets }],
    [edgeRendererPlugin, {
      components: {
        Home: "<html><body><h1 &children=\"meta.title\"></h1><p &children=\"context.headline\"></p></body></html>",
      },
      componentUtilities: {},
      globalUtilities: { init: () => ({}) },
    }],
  ],
});
```

If you are also publishing a static `build/` directory, keep Wrangler assets enabled so CSS, JS, images, and other emitted files are served directly by the `ASSETS` binding while page requests fall through to Gustwind rendering.

The script plugin writes `.gustwind/script-assets.json` during the Node build. Pass that manifest back to the Worker script plugin as `scriptAssets` so route-level `scripts` entries resolve to the same hashed module URLs that the static build uses.

## GitHub Pages

For GitHub Pages, it's a good idea to [follow Pagic documentation](https://pagic.org/docs/deployment.html). You can point to the build script within GitHub YAML configuration.
