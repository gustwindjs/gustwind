// Only shared dependencies should go here as otherwise CI
// will install too many for a simple build.
import * as fs from "https://deno.land/std@0.161.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.161.0/path/mod.ts";
import { nanoid } from "https://cdn.skypack.dev/nanoid@4.0.0?min";

export { fs, nanoid, path };
