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

## Main blockers today

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

These depend on Deno process, server, file system, command, signal, and watch APIs, and they are the main remaining barrier to a practical Node-first workflow.

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
- Still incomplete for build workers, dev server, file watching, and other tooling surfaces.

## Phase 2: Node load adapter

- Add a Node equivalent for `load-adapters/deno.ts`.
- Use `fs/promises` for file access.
- Use dynamic `import()` with file URLs for module loading.
- Preserve current task registration behavior if build tasks still depend on it.

### Notes

- File-backed rendering is now covered by `load-adapters/node.ts` and `initNodeRender(...)`.
- With Node 24, the local render-path TypeScript can now run directly as ESM after removing the few unsupported runtime constructs that were still present.
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

## Phase 4: Node CLI

- Add a Node-facing CLI only after the Node build path works reliably.
- Cover the workflows that matter in practice instead of targeting Deno-style parity.

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
  - `handleHotUpdate` and `server.ws` can replace the current custom reload transport
- This would simplify or replace the current Deno-specific dev code in:
  - `gustwind-dev-server/mod.ts`
  - `plugins/file-watcher/mod.ts`
  - `plugins/websocket/mod.ts`
  - `utilities/getWebSocketServer.ts`
- Vite would not replace Gustwind's route matching or plugin-driven rendering. It would replace the surrounding dev shell.

## Recommended implementation order

1. Make the render/build core Node-compatible.
2. Add a Node load adapter.
3. Add a Node build entrypoint.
4. Add a Node CLI for the practical build workflows.
5. Replace the Deno dev shell with a Vite-based Node dev server.

## Recommendation

Do not start with "full Node compatibility".

Start by making static builds and rendering work under Node. After that, do not try to preserve the Deno dev stack out of inertia. If Node-based development becomes important, use Vite as the new dev shell and let the old Deno-specific watcher/websocket path go away.
