// Only shared dependencies should go here as otherwise CI
// will install too many for a simple build.
import * as fs from "https://deno.land/std@0.161.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.161.0/path/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.16.10/mod.js";
import { nanoid } from "https://cdn.skypack.dev/nanoid@4.0.0?min";

export { esbuild, fs, nanoid, path };
