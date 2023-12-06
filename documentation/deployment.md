---
slug: 'deployment'
title: 'Deployment'
description: 'Gustwind can be deployed to any static host'
---
Gustwind sites can be deployed to any static host. The most difficult part is building the site and you can either push this problem to a CI provider or build at the host itself. In either case you have to take care to install Deno as it's not often available given it's still a relatively new technology.

The general approach is to first set up a build script to install Deno and run Gustwind like this:

**build.sh**

```bash
#!/usr/bin/env bash

curl -fsSL https://deno.land/x/install/install.sh | sh -s v1.38.2
/opt/buildhome/.deno/bin/deno task decompress:cache
/opt/buildhome/.deno/bin/deno run -A --unstable --no-check https://deno.land/x/gustwind@v0.56.0/gustwind-cli/mod.ts -b -t cpuMax -o ./build
```

Also make the file executable with `chmod +x` and point your CI environment to use the file when building. Usually there's a field for that in their user interface somewhere.

The benefit of using a simple script like this is that it lets you control versions of both Deno and Gustwind. Occasionally a newer version of Deno might break functionality (happened in the past) so fixing Deno version avoids this problem. Also Gustwind is bit of a moving target so it's better to fix it to a specific version as well.

## Netlify

To configure Netlify, set up a file as follows:

**netlify.toml**

[<file>](netlify.toml)

The related Deno task would install and run Gustwind. Alternatively you can leverage `build.sh` as above.

Note that Netlify environment has Deno available already but in that case you don't have control over the version so it's recommended to install the version of Deno you prefer to use.

## Vercel

For Vercel, point to `build.sh` through their user interface.

## GitHub Pages

For GitHub Pages, it's a good idea to [follow Pagic documentation](https://pagic.org/docs/deployment.html). You can point to the build script within GitHub YAML configuration.
