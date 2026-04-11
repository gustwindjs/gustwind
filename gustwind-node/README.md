# gustwind - Experimental Gustwind API for Node.js

This is an experimental API meant to be consumed through Node.js. The main use case for now has to do with Cloudflare workers as they support Node.js out of the box but come with complications for Deno (something like Denoflare is needed and that's not ideal for Cloudflare Pages).

The Node path now includes:

- a render entrypoint
- a static build entrypoint
- a Node CLI for builds
- a Vite-backed Node development server

The Node development path intentionally favors a simpler Vite full-reload workflow over preserving the older Deno watcher and websocket stack.
