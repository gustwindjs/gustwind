// Only shared dependencies should go here as otherwise CI
// will install too many for a simple build.
import * as fs from "https://deno.land/std@0.205.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.205.0/path/mod.ts";
import { nanoid } from "https://cdn.skypack.dev/nanoid@5.0.2?min";

export { fs, nanoid, path };
