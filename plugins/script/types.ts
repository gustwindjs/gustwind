import type { Route } from "../../types.ts";

const SCRIPT_ASSETS_MANIFEST_PATH = ".gustwind/script-assets.json";

type ScriptEntryAsset = { file: string; css?: string[] };
type ScriptEntryAssets = Record<string, ScriptEntryAsset>;
type FoundScript = { name: string; path: string; externals?: string[] };
type ScriptPluginContext = {
  foundScripts: FoundScript[];
  receivedScripts: {
    isExternal?: boolean;
    name: string;
    localPath: string;
    remotePath: string;
    externals?: string[];
  }[];
  receivedGlobalScripts: { type: string; src: string }[];
};
type ReceivedScript = ScriptPluginContext["receivedScripts"][number];
type ReceivedGlobalScript =
  ScriptPluginContext["receivedGlobalScripts"][number];
type RouteScripts = NonNullable<Route["scripts"]>;
type ScriptContextInput = {
  name: string;
  src?: string;
  srcPrefix?: string;
  [key: string]: unknown;
};

export { SCRIPT_ASSETS_MANIFEST_PATH };
export type {
  FoundScript,
  ReceivedGlobalScript,
  ReceivedScript,
  RouteScripts,
  ScriptContextInput,
  ScriptEntryAsset,
  ScriptEntryAssets,
  ScriptPluginContext,
};
