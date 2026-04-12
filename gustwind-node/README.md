# gustwind - Experimental Gustwind API for Node.js

This is an experimental API meant to be consumed through Node.js. The main use case for now has to do with edge-style and worker-style deployment targets that already support Node.js without an extra compatibility layer.

The Node path now includes:

- a render entrypoint
- a static build entrypoint
- a Node CLI for build, develop, and serve workflows
- a Vite-backed Node development server
- a Node static server for built output directories

The Node development path intentionally favors a simpler Vite full-reload workflow over preserving the older custom watcher and websocket stack.
