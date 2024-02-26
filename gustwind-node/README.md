# gustwind - Experimental Gustwind API for Node.js

This is an experimental API meant to be consumed through Node.js. The main use case for now has to do with Cloudflare workers as they support Node.js out of the box but come with complications for Deno (something like Denoflare is needed and that's not ideal for Cloudflare Pages).

Note that this includes only plugin-related functionality and excludes the CLI. Therefore you cannot run Gustwind through Node.js directly yet. You can compile individual pages through it, however. Technically a Node.js CLI could be built around this piece of functionality to allow faster builds etc.
