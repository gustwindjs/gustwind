---
slug: 'node-compatibility-plan'
title: 'Node Compatibility Plan'
description: 'Phased plan for adding Node.js compatibility to Gustwind'
---
# Node Compatibility Plan

## Goal

Move Gustwind onto Node.js in phases, starting from the shared render/build core and continuing through the development server only where that work clearly reduces complexity.

The practical target is:

1. Make the render/build core Node-compatible.
2. Add a Node build entrypoint.
3. Replace the Deno development shell instead of preserving parity with it.
4. Use Vite as the preferred development-server foundation if that simplifies watch, reload, and asset serving.

## Scope

### Realistic first target

- Core rendering
- Plugin orchestration
- Static build path

### Later target

- Development server
- File watching
- Live reload / websocket tooling
- Practical CLI coverage on Node

### Explicit non-targets

- Maintaining long-term Deno compatibility
- Preserving the current Deno dev server if a Node/Vite path is simpler
- Achieving one-to-one runtime parity purely for compatibility's sake

### Exit criterion

Once the Node implementation reaches practical feature parity with the remaining Deno path, the Deno implementation should be removed instead of maintained in parallel.

That applies both to:

- runtime code paths
- user-facing commands
- documentation and project copy that still describe Gustwind as Deno-first

## Existing starting points

The repository already has pieces that point toward a non-Deno runtime:

- `gustwind-node/mod.ts`
- `routers/edge-router/mod.ts`
- `renderers/htmlisp-edge-renderer/mod.ts`

These suggest that the rendering and routing core can be separated from the Deno-specific runtime surface.

## Current status

The first rendering-focused compatibility step is now implemented:

- shared render-path debug/env access no longer assumes only one runtime
- `gustwind-node/mod.ts` now supports an in-memory plugin setup without requiring a filesystem-backed load adapter
- `load-adapters/memory.ts` provides the default non-filesystem loader for that path
- `utilities/htmlLoader.ts` no longer reads component files directly through `Deno.*`
- `gustwind-node/mod_test.ts` covers in-memory rendering with:
  - `routers/edge-router/mod.ts`
  - `plugins/meta/mod.ts`
  - `renderers/htmlisp-edge-renderer/mod.ts`

This means the core orchestration and rendering flow can now run in a runtime-neutral, in-memory configuration. The remaining Node work is mostly about build execution and development tooling.

The next rendering-focused step is also now implemented:

- `load-adapters/node.ts` provides a file-backed loader using Node APIs
- the project now explicitly targets Node 24 for this compatibility path
- non-erasable TypeScript syntax in the shared render path has been removed where Node 24 would otherwise reject it
- the Node loader now relies on Node 24's built-in TypeScript execution for local `.ts` modules when their dependency graph stays local
- the same loader falls back to bundling only when a module graph reaches remote `http(s)` imports, which covers the Deno-style remote module pattern used in this repository
- `gustwind-node/mod.ts` exports `initNodeRender(...)` for filesystem-backed rendering
- `gustwind-node/mod.ts` now accepts Node plugin path references for initial plugins, not only pre-imported plugin modules
- `gustwind-node/mod_test.ts` now covers rendering through:
  - `renderers/htmlisp-renderer/mod.ts`
  - on-disk HTML components
  - on-disk utility modules loaded through the Node adapter
  - local TypeScript utility imports
  - remote HTTP TypeScript imports
  - initial plugin modules loaded from filesystem paths

This means Gustwind now supports both:

- in-memory runtime-neutral rendering
- file-backed rendering through a Node-style load adapter
- filesystem-backed utility/data-source style modules executed directly by Node 24
- remote module imports in the shared render path

for the shared render core.

The next build-focused step is now implemented:

- `gustwind-node/build.ts` provides a Node-first static builder that reuses the shared plugin/router/render pipeline
- the first Node build path intentionally uses a single-process task queue instead of recreating the Deno worker model
- `gustwind-node/cli.ts` provides practical Node CLI coverage for the build workflow
- path-based plugins from `plugins.json` now load through the configured runtime load adapter instead of a Deno-style direct `import(...)`
- `utilities/esbuild.ts` centralizes esbuild loading so shared build helpers no longer assume Deno-only imports
- the Node build path now has automated coverage in `gustwind-node/build_test.ts`
- build-relevant `npm:` imports have started moving to normal Node package imports where that reduces friction for the Node path

This means the migration now has:

- a tested Node render path
- a tested Node build path for local path-based plugin graphs
- a practical Node CLI entrypoint for static builds

The current remaining gap is the real site's remote module graph. A full repository build now gets far enough to start bundling through the Node CLI, but it still depends on fetching `http(s)` imports from the existing source tree. That is acceptable for now, but it means the repository is not yet fully self-contained for offline Node builds.

The next repository-focused cleanup step is now implemented:

- active site build modules no longer depend on remote `http(s)` imports for:
  - frontmatter parsing
  - markdown rendering
  - syntax highlighting
  - sitemap generation
  - URL joining helpers
- the active site path no longer relies on Twind during the Node build
- a full repository Node build now completes through `gustwind-node/cli.ts`
- the project quality gate now includes a real Node build smoke check

This means the Node build path is no longer limited to synthetic fixture tests. It now builds the actual repository successfully.

The next development-focused step is now implemented:

- `gustwind-node/dev.ts` provides a Node 24 development server built on Vite middleware mode
- `gustwind-node/cli.ts` now supports `--develop` for the Node path
- the Node dev path uses Vite's client, watcher, and websocket transport for full reloads
- the Node dev path now routes reload handling through Vite's hot-update hook instead of a custom watcher callback loop
- Node development module loading now bundles local module graphs on the dev path so edits reload cleanly without relying on Deno-style import semantics
- generated build-style assets in development still reuse the shared plugin task pipeline instead of duplicating a second asset system

This means Gustwind now has a practical Node-first development shell in addition to the existing Node render and build entrypoints. The remaining work is mainly cleanup, sharper reload granularity, and retiring older Deno-specific dev surfaces.

The next CLI-focused step is now implemented:

- `gustwind-node/serve.ts` provides a Node-native static file server for built output directories
- `gustwind-node/cli.ts` now supports `--serve` and `--input` in addition to build and develop
- the Node quality gate now includes focused coverage for the Node static server path

This means the Node CLI now covers the main practical workflows that previously required the Deno CLI: build output generation, development serving, and static build serving.

The next consolidation-focused step is now implemented:

- repository `start` and `serve` tasks now point directly to the Node CLI path
- `gustwind-cli/mod.ts` now delegates `develop` and `serve` commands to `gustwind-node/cli.ts`
- the old Deno watcher/websocket/dev-server stack is no longer the primary user-facing workflow

This means the remaining Deno dev-server code is now mostly compatibility baggage rather than an active first-class path.

The next build-consolidation step is now implemented:

- `gustwind-cli/mod.ts` now delegates `build` to `gustwind-node/cli.ts` as well
- repository `build` tasks now point directly to the Node CLI path
- the practical default build, develop, and serve workflows now all route through the Node implementation

This means the Deno CLI is no longer the default execution path for the main site lifecycle commands.

The next runtime-removal step is now implemented:

- package-root exports now point at the Node API surface instead of the old Deno dev/serve helpers
- the obsolete Deno dev server, static server, watcher, and websocket modules have been removed
- the test suite no longer carries dedicated coverage for the removed Deno watcher utility

This means the remaining migration work is no longer about keeping an alternate Deno runtime alive. It is mainly about removing stale Deno-first wording and any optional leftovers that still assume the old runtime.

The next optional-feature cleanup step is now implemented:

- the obsolete page-editor plugin path has been removed instead of being carried forward as broken compatibility code
- prepublish no longer compiles editor-side compatibility scripts for that removed path

This means the remaining migration work is focused on the active runtime surface, not on reviving experimental editor tooling that is no longer part of the main workflow.

The next project-copy cleanup step is now implemented:

- README, package metadata, and site metadata now describe Gustwind as Node.js-powered instead of Deno-powered
- deployment guidance now points to the Node build path instead of a Deno install-and-run flow
- npm script messaging no longer tells users to reach for Deno tasks as the primary workflow

This means the remaining Deno-first messaging is now mostly contained to migration notes and internal tooling, not to the primary user-facing project description.

The next tooling-copy cleanup step is now implemented:

- Playwright e2e setup now builds the site through the Node CLI path instead of `deno task build`
- developer notes now point contributors at the Node CLI and npm scripts for the main workflow

This means the remaining Deno mentions are increasingly limited to internal packaging helpers and migration notes rather than everyday development commands.

The next compatibility-wrapper cleanup step is now implemented:

- the legacy Deno CLI wrapper has been removed instead of being kept as a pass-through shell around the Node CLI
- deployment build scripts now run the Node build directly instead of installing Deno first
- the built site and e2e assertions now use Node.js-powered copy instead of stale Deno-powered wording

This means the remaining Deno surface is now mostly limited to internal testing and packaging helpers rather than user-facing runtime, CLI, or site output.

The next legacy-build cleanup step is now implemented:

- the unused Deno-only worker-based builder has been removed instead of being kept beside the active Node builder
- the old Deno runtime load adapter has been removed with that dead build path
- checked-in Netlify build configuration now runs the Node build directly instead of bootstrapping Deno first

This means the remaining Deno surface is now concentrated even further into internal tests, packaging helpers, and a small number of migration-era documents.

The next task-runner cleanup step is now implemented:

- the repository no longer carries a top-level `deno.json` task file for everyday commands
- project-level build, serve, typecheck, quality, and packaging entrypoints now live in `package.json` under `npm run`
- the remaining Deno-based checks and packaging helpers are now hidden behind npm scripts instead of being a first-class task runner story

This means the remaining Deno surface is now mostly implementation detail, not a primary command interface exposed by the repository.

The next test-runner cleanup step is now implemented:

- `gustwind-node/mod_test.ts` now runs under `node --test` instead of `Deno.test`
- `gustwind-node/build_test.ts` now runs under `node --test` instead of `Deno.test`
- the Node render/build test path now skips only the remote-import listener case when the current sandbox forbids opening a localhost port

This means the remaining Deno-based test surface is increasingly concentrated in the older shared HTMLisp and router suites rather than in the active Node runtime path.

The next router-test cleanup step is now implemented:

- `routers/utilities/*_test.ts` now runs under `node --test` instead of `Deno.test`
- the quality gate now exercises router utility coverage through the Node test runner rather than the Deno test runner

This means the remaining Deno-based test surface is now concentrated more narrowly in the older HTMLisp suites and related parsing/utilities coverage, not in the active router/runtime helpers.

The next lockfile cleanup step is now implemented:

- the obsolete Deno lockfiles have been removed
- the remaining internal Deno commands now run with `--no-lock` so they do not regenerate fresh lockfiles during normal development

This means npm lockfiles now own dependency pinning for the active workflow, while the shrinking Deno surface no longer leaves behind repository lockfile noise.

The next residual-copy cleanup step is now implemented:

- the unused filesystem cache helper that still depended on `Deno.*` has been removed
- dead commented editor/runtime code that still referenced `Deno.*` has been removed from the active renderer path
- remaining runtime/documentation wording now prefers runtime-neutral or Node-first phrasing over stale Deno-specific references

This means more of the remaining Deno surface is now confined to deliberate internal tooling and shared legacy tests instead of stray dead code or outdated copy in active modules.

The next shared-test cleanup step is now implemented:

- the HTMLisp async/sync render suites, HTMLisp utility tests, and HTMLisp HTML parser tests now run under `node --test`
- the default quality gate now exercises the migrated shared tests through the Node test runner
- the obsolete LaTeX parser subtree has now been removed instead of being kept as an isolated Deno-only test island

This means the remaining Deno-based test surface has been removed from the repository. The only meaningful Deno dependency left is the separate repository-wide typecheck path.

The next packaging-helper cleanup step is now implemented:

- npm package build scripts now run through a Node/esbuild packager instead of the old Deno/`dnt` helpers
- the old Deno-based npm packaging scripts have been removed
- contributor publishing notes now point at the Node packaging path without caveating Deno internals

This means the remaining Deno surface no longer includes the npm packaging workflow. It is now limited to the shared typecheck path.

The final toolchain-cleanup step is now implemented:

- repository-wide typechecking now runs through a root `tsconfig.json` and `tsc --noEmit`
- the old `deno check` path has been removed from the npm scripts
- active runtime code no longer carries Deno-specific environment fallbacks or lint directives

This means Deno is no longer required for the active runtime, development workflow, verification flow, or npm packaging path.

## Migration status today

### Node migration end state

- the practical Node feature-parity target has been reached
- the old Deno runtime, task runner, packaging helpers, and test runner paths have been removed
- repository-level commands, docs, and package metadata now point at the Node implementation

### Remaining remote-import surface

- browser-only scripts and optional modules that still intentionally reference remote CDNs
- other optional modules that are outside the active production build path

These no longer block the full repository build that is currently in use, but they still exist as compatibility debt in optional or inactive paths.

## Required abstractions

Introduce runtime abstractions for:

- file system access
- JSON/module/text loading
- environment access
- worker pool execution
- file watching
- HTTP serving
- optional shell/process integration

The design should prefer Node implementations and shared interfaces. Deno-specific implementations only matter where they still help the migration and should not drive the shape of the final architecture.

## Proposed phases

## Phase 1: Runtime boundary cleanup

- Separate shared core logic from Deno entrypoints.
- Keep plugin orchestration and rendering code free of direct Deno dependencies where possible.
- Move remaining runtime-specific logic behind narrow interfaces that Node can own.

### Phase 1 progress

- Completed for the shared render path.
- The remaining work in this phase is mostly cleanup of old wrappers and project messaging, not core runtime viability.

## Phase 2: Node load adapter

- Add a Node equivalent for the old Deno-specific load adapter.
- Use `fs/promises` for file access.
- Use dynamic `import()` with file URLs for module loading.
- Preserve current task registration behavior if build tasks still depend on it.

### Notes

- File-backed rendering is now covered by `load-adapters/node.ts` and `initNodeRender(...)`.
- With Node 24, the local render-path TypeScript can now run directly as ESM after removing the few unsupported runtime constructs that were still present.
- The old Deno-specific load adapter has now been removed along with the dead Deno builder path that depended on it.
- The Node module loader now bundles only the cases that still exceed Node 24's built-in support, mainly remote `http(s)` imports.
- The Node render entrypoint can now load initial plugins from paths directly through `gustwind-node/mod.ts`.
- Remaining work is now mostly about:
  - carrying the shared core into a real Node build entrypoint
  - reusing the same Node-aware module loading strategy across config-driven plugin loading and build orchestration
  - removing Deno-first assumptions from the remaining build and dev surfaces

## Phase 3: Node build path

- Add a Node build entrypoint that reuses the shared core.
- Replace Deno worker usage with either:
  - `worker_threads`, or
  - a simpler single-process fallback first
- Prefer the simpler fallback if parallelism complicates the first working version.

### Phase 3 progress

- Completed for a first working single-process builder in `gustwind-node/build.ts`.
- Covered by `gustwind-node/build_test.ts`.
- The shared plugin importer now respects the active runtime loader for path-based plugins, which is required for config-driven Node builds.
- The actual repository now builds successfully through the Node CLI.
- The unused Deno worker-based builder has now been removed.
- Remaining work in this phase is now mostly cleanup of optional remote-import paths and leftover test/tooling surfaces, not core build viability.

## Phase 4: Node CLI

- Add a Node-facing CLI only after the Node build path works reliably.
- Cover the workflows that matter in practice instead of targeting Deno-style parity.

### Phase 4 progress

- A practical Node CLI now exists in `gustwind-node/cli.ts`.
- Current scope covers version output, static build, development serving, and static build serving.
- The old Deno CLI compatibility wrapper has now been removed instead of being kept as a second entrypoint.
- Repository-level build, start, and serve tasks now use the Node path directly.
- Repository-level command entrypoints now live in `package.json` instead of a separate `deno.json` task file.
- The Node-specific render/build tests now run under `node --test` instead of the Deno test runner.
- The router utility tests now run under `node --test` instead of the Deno test runner as well.
- The general HTMLisp render/parser test suites now run under `node --test`.
- The npm package build helpers now run through a Node/esbuild path instead of `dnt`.
- The package-root runtime exports now point to the Node API surface.
- The quality gate now verifies that the Node CLI can build the repository.

## Phase 5: Node dev server on Vite

- Replace the current Deno dev server with a Node 24 dev server built on Vite middleware mode.
- Use Vite's watcher and websocket/HMR transport instead of preserving the current custom Deno watcher/websocket stack.
- Keep Gustwind's route matching and render pipeline, but mount it behind Vite middleware.
- Let Vite handle dev-only concerns it is already good at:
  - file watching
  - websocket transport
  - reload signaling
  - asset and client script serving
  - middleware composition

### Notes

- The latest Vite docs show this path is viable on Node 24:
  - `createServer(...)` and `server.middlewareMode` provide a custom-server integration path
  - `configureServer` allows Gustwind-specific middleware wiring
  - `server.ws` can replace the current custom reload transport
- This would simplify or replace the current Deno-specific dev code in:
  - `gustwind-dev-server/mod.ts`
  - `plugins/file-watcher/mod.ts`
  - `plugins/websocket/mod.ts`
  - `utilities/getWebSocketServer.ts`
- Vite would not replace Gustwind's route matching or plugin-driven rendering. It would replace the surrounding dev shell.

### Phase 5 progress

- A first Vite-backed Node development server now exists in `gustwind-node/dev.ts`.
- The Node CLI now exposes `--develop`.
- The Node CLI now also exposes `--serve`.
- Repository-level `start` and `serve` tasks now use the Node path directly.
- Repository-level `build` tasks now use the Node path directly.
- The Node dev path deliberately uses Vite full reloads instead of reproducing the older custom websocket protocol.
- Reload handling now runs through Vite's hot-update hook while dynamic watched paths still come from Gustwind task discovery.
- The old Deno-specific dev server, watcher, and websocket runtime modules have now been removed.
- The obsolete page-editor plugin path has also been removed instead of being preserved as a parity target.
- Primary user-facing project copy now describes Gustwind as Node.js-powered instead of Deno-powered.
- The legacy Deno CLI wrapper has now been removed as well.
- Netlify's checked-in build configuration now uses the Node build directly as well.
- Everyday repository commands now route through `npm run`.
- Repository-wide typechecking now runs through `tsc` instead of `deno check`.
- Remaining work is mostly:
  - improving reload precision beyond full-page refreshes

## Recommended implementation order

1. Make the render/build core Node-compatible.
2. Add a Node load adapter.
3. Add a Node build entrypoint.
4. Replace the Deno dev shell with a Vite-based Node dev server.
5. Remove the remaining Deno-first project copy and internal implementation details now that the Node path covers the practical workflow.

## Recommendation

Do not start with "full Node compatibility".

Start by making static builds and rendering work under Node. That baseline exists, the actual repository builds successfully through the Node CLI, and there is now a Vite-based Node dev server as well. The next useful step is final cleanup: strip the remaining Deno-first wording and internal tooling from the project so Node becomes the only first-class runtime story.
