// Only shared dependencies should go here as otherwise CI
// will install too many for a simple build.
import * as fs from "https://deno.land/std@0.207.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.207.0/path/mod.ts";

export { fs, path };
