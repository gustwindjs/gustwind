---
slug: 'deployment'
title: 'Deployment'
---
Gustwind sites can be deployed to any static host. The most difficult is building the site and you can either push this problem to a CI provider or build at the host itself. In either case you have to take care to install Deno as it's not often available given it's still a relatively new technology.

## Netlify

To configure Netlify, set up a file as follows.

**netlify.toml**

```yaml
[build]
  base    = ""
  publish = "build"
  command = "curl -fsSL https://deno.land/x/install/install.sh | sh -s v1.16.0 && /opt/buildhome/.deno/bin/deno run -A --unstable --no-check https://deno.land/x/gustwind@${VERSION}/cli.ts -b"
```

> Remember to replace `VERSION` with the version of Gustwind you prefer to use!

## Vercel

For Vercel, [see Aleph.js deployment instructions](https://alephjs.org/docs/deployment). I've included possible field values below:

* Build command – `deno run -qA https://code.velociraptor.run vercel:build`
* Output directory – `public`
* Install command – `curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=/usr/local sh`

That's the setup from [the Sidewind project](https://github.com/survivejs/sidewind).

> Remember to replace `VERSION` with Gustwind version!

## GitHub Pages

For GitHub Pages, it's a good idea to [follow Pagic documentation](https://pagic.org/docs/deployment.html).

You can [find a concrete example of Gustwind hosted on GitHub Pages at the dragjs project](https://github.com/bebraw/dragjs).
