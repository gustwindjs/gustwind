import * as async from "https://deno.land/std@0.113.0/async/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.13.7/mod.js";
import * as fs from "https://deno.land/std@0.113.0/fs/mod.ts";
import * as flags from "https://deno.land/std@0.113.0/flags/mod.ts";
import { HighlightJS } from "https://cdn.skypack.dev/highlight.js@11.3.1?min";
import highlightJS from "https://unpkg.com/highlight.js@11.3.1/es/languages/javascript";
import highlightJSON from "https://unpkg.com/highlight.js@11.3.1/es/languages/json";
import highlightTS from "https://unpkg.com/highlight.js@11.3.1/es/languages/typescript";
import * as marked from "https://unpkg.com/marked@4.0.0/lib/marked.esm.js";
import * as oak from "https://deno.land/x/oak@v9.0.1/mod.ts";
import * as path from "https://deno.land/std@0.113.0/path/mod.ts";
import * as websockets from "https://deno.land/x/websocket@v0.1.3/mod.ts";
import * as yaml from "https://esm.sh/yaml@1.10.2";
import * as yamlParse from "https://deno.land/std@0.113.0/encoding/yaml.ts";

export {
  async,
  esbuild,
  flags,
  fs,
  HighlightJS as highlight,
  highlightJS,
  highlightJSON,
  highlightTS,
  marked,
  oak,
  path,
  websockets,
  yaml,
  yamlParse,
};
