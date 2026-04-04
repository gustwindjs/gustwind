---
slug: 'node-compatibility-plan'
title: 'Node Compatibility Plan'
description: 'Phased plan for adding Node.js compatibility to Gustwind'
---
# Node Compatibility Plan

## Goal

Add Node.js compatibility to Gustwind in a phased way without trying to port the entire Deno-centric toolchain at once.

The practical target is:

1. Make the render/build core runtime-agnostic.
2. Add a Node build entrypoint.
3. Keep Deno-only development mode at first.
4. Revisit watch/dev-server support later if there is an actual need.

## Scope

### Realistic first target

- Core rendering
- Plugin orchestration
- Static build path

### Later target

- Development server
- File watching
- Live reload / websocket tooling
- Full CLI parity

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

This means the core orchestration and rendering flow can now run in a runtime-neutral, in-memory configuration. The remaining Node work is mostly about file-backed loading, build execution, and development tooling.

The next rendering-focused step is also now implemented:

- `load-adapters/node.ts` provides a file-backed loader using Node APIs
- the Node loader now bundles authored modules before import so local `.ts` files do not rely on raw Node `import()` support
- the same loader resolves remote `http(s)` imports during bundling, which covers the Deno-style remote module pattern used in this repository
- `gustwind-node/mod.ts` exports `initNodeRender(...)` for filesystem-backed rendering
- `gustwind-node/mod.ts` now accepts Node plugin path references for initial plugins, not only pre-imported plugin modules
- `gustwind-node/mod.mjs` provides a plain-Node bootstrap entrypoint that bundles the TypeScript render core before exposing the render API
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
- filesystem-backed utility/data-source style modules that need TypeScript transpilation
- remote module imports in the shared render path
- Node-friendly bootstrap access to the render API without depending on direct raw-TS imports

for the shared render core.

## Main blockers today

### Deno-specific loading

- `load-adapters/deno.ts`

This currently owns module loading, JSON loading, text-file loading, and task registration in a Deno-specific way.

### Deno worker model

- `gustwind-builder/createWorkerPool.ts`
- `gustwind-builder/buildWorker.ts`

The build pipeline currently depends on Deno workers and Deno file APIs.

### Deno-only runtime services

- `gustwind-cli/mod.ts`
- `gustwind-dev-server/mod.ts`
- `gustwind-serve/mod.ts`
- `plugins/file-watcher/mod.ts`
- `utilities/getWebSocketServer.ts`

These depend on Deno process, server, file system, command, signal, and watch APIs.

## Required abstractions

Introduce runtime abstractions for:

- file system access
- JSON/module/text loading
- environment access
- worker pool execution
- file watching
- HTTP serving
- optional shell/process integration

The design should allow keeping Deno implementations while adding Node implementations beside them.

## Proposed phases

## Phase 1: Runtime boundary cleanup

- Separate runtime-neutral core logic from Deno entrypoints.
- Keep plugin orchestration and rendering code free of direct Deno dependencies where possible.
- Move Deno-specific logic behind narrow interfaces.

### Phase 1 progress

- Completed for the shared render path.
- Still incomplete for build workers, dev server, file watching, and other tooling surfaces.

## Phase 2: Node load adapter

- Add a Node equivalent for `load-adapters/deno.ts`.
- Use `fs/promises` for file access.
- Use dynamic `import()` with file URLs for module loading.
- Preserve current task registration behavior if build tasks still depend on it.

### Notes

- File-backed rendering is now covered by `load-adapters/node.ts` and `initNodeRender(...)`.
- The Node module loader now bundles local and remote authored modules, which removes the biggest immediate incompatibility for render-time utilities and data sources.
- The Node render entrypoint can now load initial plugins from paths and can be entered through `gustwind-node/mod.mjs` under plain Node.
- Remaining work is now mostly about:
  - carrying the shared core into a real Node build entrypoint
  - reusing the same Node-aware module loading strategy across config-driven plugin loading and build orchestration
  - deciding how much Deno-first behavior should remain supported outside the render path

## Phase 3: Node build path

- Add a Node build entrypoint that reuses the shared core.
- Replace Deno worker usage with either:
  - `worker_threads`, or
  - a simpler single-process fallback first
- Prefer the simpler fallback if parallelism complicates the first working version.

## Phase 4: Optional Node CLI

- Add a Node-facing CLI only after the Node build path works reliably.
- Do not aim for full feature parity immediately.

## Phase 5: Dev-mode parity

- Port file watching with `chokidar` or `fs.watch`.
- Port websocket/live-reload utilities.
- Add a Node dev server.

This phase should be treated as optional unless Node-based development becomes a real requirement.

## Recommended implementation order

1. Make the render/build core runtime-agnostic.
2. Add a Node load adapter.
3. Add a Node build entrypoint.
4. Keep Deno dev mode unchanged.
5. Port watch/dev-server support only if needed.

## Recommendation

Do not start with "full Node compatibility".

Start by making static builds and rendering work under Node. That gets most of the practical value with much less risk than porting the entire development toolchain up front.
