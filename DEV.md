# Development

Use the Node CLI and `npm` scripts for the main site lifecycle commands.

To test the CLI locally, use `node ./gustwind-node/cli.ts` with the appropriate flags, or the matching `npm` scripts such as `npm run build`, `npm run build:release`, `npm run dev`, and `npm run serve`.

Generated HTML validation is available through `gustwind-node --validate --input ./build`, and `gustwind-node --build --validate` validates build output directly. The project-level shortcuts are `npm run validate:html` and `npm run build:node:check`.

## Testing Netlify edge functions

Make sure you have a recent version of Node installed and then run `npm install netlify-cli -g`. After that the development environment is available through `netlify dev`. Note that it depends on a static build so run `npm run build` first to generate one. Use `npm run build:release` if you need Pagefind search assets in that build.

There's [a good overview of Netlify edge functions](https://docs.netlify.com/edge-functions/overview/) and [Netlify serverless functions](https://docs.netlify.com/functions/overview/). Also [the tutorial on how to generate OG images on the fly is handy](https://www.netlify.com/blog/dynamically-generate-open-graph-image-variants/).

## Publishing to npm

`package.json` is now the release source of truth for both the local CLI version and the published `gustwind`/`htmlisp` package version.

### Automated release from `main`

When `.github/workflows/release.yml` runs on a push to `main`, it will:

1. Read the version from `package.json`
2. Skip the run if `gustwind@<version>`, `htmlisp@<version>`, and GitHub release `v<version>` already exist
3. Run `npm run quality:gate`
4. Build release tarballs through `npm run release:local -- <VERSION>`
5. Publish any missing npm packages
6. Create GitHub release `v<VERSION>` and attach both tarballs

The intended flow is therefore:

1. Update `package.json` with the next release version in the PR that should ship
2. Merge that PR to `main`
3. Let the release workflow publish the version once

One-time setup required on npm/GitHub:

1. Configure npm trusted publishing for `gustwind` and `htmlisp` to trust this repository workflow
2. If you want a fallback path, add repository secret `NPM_TOKEN`; the workflow will use it if present

### Manual release

1. `npm run build:npm:gustwind -- <VERSION>` where `VERSION` is `0.1.0` for example
2. `cd gustwind-node/npm`
3. `npm publish`. You may need to pass `--otp` here as well (preferred for security)

For a local release build that prepares all artifacts at once, run:

1. `npm run release:local -- <VERSION>` or `npm run release:local` to use the version from `package.json`
2. Inspect the site build at `./build`
3. Inspect the package directories at `./gustwind-node/npm` and `./htmlisp/npm`
4. Inspect the packed tarballs at `./.release/<VERSION>/`
