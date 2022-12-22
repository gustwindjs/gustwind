// Only shared dependencies should go here as otherwise CI
// will install too many for a simple build.
import * as fs from "https://deno.land/std@0.161.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.161.0/path/mod.ts";
import { nanoid } from "https://cdn.skypack.dev/nanoid@4.0.0?min";

// For an unknown reason, esbuild triggers "text file busy" kind of error on Netlify
// when using multiple workers.
// https://stackoverflow.com/questions/16764946/what-generates-the-text-file-busy-message-in-unix
// implies this has something to do with installation.
import * as esbuild from "https://deno.land/x/esbuild@v0.15.13/mod.js";
// import * as esbuild from "https://deno.land/x/esbuild@v0.16.10/mod.js";

export { esbuild, fs, nanoid, path };
