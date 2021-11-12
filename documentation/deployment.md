---
slug: 'deployment'
title: 'Deployment'
---
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

> Remember to replace `VERSION` with the version of Gustwind you prefer to use!

### Vercel

For Vercel, [see Aleph.js deployment instructions](https://alephjs.org/docs/deployment) and replace the build command with `deno run -A --unstable --no-check https://deno.land/x/gustwind@${VERSION}/cli.ts -b`

> Remember to replace `VERSION` with Gustwind version!