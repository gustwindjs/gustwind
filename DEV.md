# Development

Use the Node CLI and `npm` scripts for the main site lifecycle commands.

To test the CLI locally, use `node ./gustwind-node/cli.ts` with the appropriate flags, or the matching `npm` scripts such as `npm run build`, `npm run dev`, and `npm run serve`.

Generated HTML validation is available through `gustwind-node --validate --input ./build`, and `gustwind-node --build --validate` validates build output directly. The project-level shortcuts are `npm run validate:html` and `npm run build:node:check`.

## Testing Netlify edge functions

Make sure you have a recent version of Node installed and then run `npm install netlify-cli -g`. After that the development environment is available through `netlify dev`. Note that it depends on a static build so run `npm run build` first to generate one.

There's [a good overview of Netlify edge functions](https://docs.netlify.com/edge-functions/overview/) and [Netlify serverless functions](https://docs.netlify.com/functions/overview/). Also [the tutorial on how to generate OG images on the fly is handy](https://www.netlify.com/blog/dynamically-generate-open-graph-image-variants/).

## Publishing to npm

1. `npm run build:npm:gustwind -- <VERSION>` where `VERSION` is `0.1.0` for example
2. `cd gustwind-node/npm`
3. `npm publish`. You may need to pass `--otp` here as well (preferred for security)
