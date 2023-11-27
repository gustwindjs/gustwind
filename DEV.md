# Development

Use `deno task` to see available tasks and to run them.

To test the cli locally, use `deno install --no-check -A -f --unstable -n gustwind ./gustwind-cli/mod.ts`. A symlink would likely work as well.

## Testing Netlify edge functions

Make sure you have a recent version of Node installed (18 or higher) and then run `npm install netlify-cli -g`. After that the development environment is available through `deno task start:netlify`. Note that it depends on a static build so run `deno task build` first to generate one.

There's [a good overview of Netlify edge functions](https://docs.netlify.com/edge-functions/overview/). Also [the tutorial on how to generate OG images on the fly is handy](https://www.netlify.com/blog/dynamically-generate-open-graph-image-variants/).

## Publishing to deno.land

Publishing to deno.land goes through the [publish](https://deno.land/x/publish) utility.

## Publishing to npm

1. `deno task build:gustwind-for-npm <VERSION>` where `VERSION` is `0.1.0` for example
2. `cd gustwind/npm`
3. `npm publish`. You may need to pass `--otp` here as well (preferred for security)
