// TODO: Too specific
import type { Component, Utilities } from "./breezewind/types.ts";

type Props = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
type Attributes = Record<string, any>;
type Category = { id: string; title: string; url: string };

type DataContext = Record<string, unknown> | Record<string, unknown>[];
type ParentCategory = { title: string; children: Category[] };

type DataSourcesModule = {
  init({ load }: { load: LoadApi }): DataSources;
};
type DataSource = { operation: string; name?: string; parameters?: unknown[] };
type DataSources = Record<string, () => unknown[]>;

type PluginOptions = { path: string; options: Record<string, unknown> };

type Meta = Record<string, string>;
type Mode = "development" | "production";

// This is the context used when rendering a page
type Context = Record<string, unknown>;

type Plugin<O = Record<string, unknown>> = {
  meta: {
    name: string;
    dependsOn?: string[];
  };
  init(args: PluginParameters<O>): Promise<PluginApi> | PluginApi;
};

type PluginParameters<O = Record<string, unknown>> = {
  cwd: string;
  load: LoadApi;
  mode: Mode;
  outputDirectory: string;
  options: O;
};

type LoadApi = {
  dir({ path, extension, recursive, type }: {
    path: string;
    type: string;
    extension?: string;
    recursive?: boolean;
  }): Promise<{ name: string; path: string }[]>;
  json<T>({ path, type }: { path: string; type: string }): Promise<T>;
  module<T>({ path, type }: { path: string; type: string }): Promise<T>;
  textFile(path: string): Promise<string>;
  textFileSync(path: string): string;
};

type PluginApi = {
  // Send messages to other plugins before other hooks are applied. This
  // is useful for giving specific instructions on what to do.
  sendMessages?({ send }: { send: Send }): Promise<Tasks | void> | Tasks | void;
  // Return additional tasks to perform per build preparation
  prepareBuild?({ send }: { send: Send }): Promise<Tasks | void> | Tasks | void;
  // Return additional tasks to perform per build finishing
  finishBuild?({ send }: { send: Send }): Promise<Tasks | void> | Tasks | void;
  // Optional cleanup for global operations that should happen only once per process
  cleanUp?({ routes }: { routes: Routes }): void;
  // Run setup before context is resolved or add something to it
  prepareContext?(
    { send, route, url }: { send: Send; route: Route; url: string },
  ):
    | Promise<{ context: Record<string, unknown> } | void>
    | {
      context: Record<string, unknown>;
    }
    | void;
  beforeEachRender?(
    { context, send, route, url }: {
      context: Context;
      send: Send;
      route: Route;
      url: string;
    },
  ):
    | Promise<
      Tasks | void
    >
    | Tasks
    | void;
  render?({ routes, route, context, send, url }: {
    routes: Routes;
    route: Route;
    context: Context;
    send: Send;
    url: string;
  }): Promise<string> | string;
  afterEachRender?({ markup, context, route, send, url }: {
    markup: string;
    context: Context;
    route: Route;
    send: Send;
    url: string;
  }): Promise<{ markup: string }> | { markup: string };
  onMessage?(
    { message }: { message: SendMessageEvent },
  ):
    | void
    | unknown
    | { send: SendMessageEvent[] }
    | Promise<void | unknown | { send: SendMessageEvent[] }>;
  getAllRoutes?():
    | Promise<{ routes: Record<string, Route>; tasks: Tasks }>
    | { routes: Record<string, Route>; tasks: Tasks };
  matchRoute?(
    allRoutes: Routes,
    url: string,
  ): Promise<{ route?: Route; tasks: Tasks; allRoutes: Routes }> | {
    route?: Route;
    tasks: Tasks;
    allRoutes: Routes;
  };
  onTasksRegistered?({ send, tasks }: { tasks: Tasks; send: Send }): void;
};

type Send = (
  pluginName: string,
  { type, payload }: SendMessageEvent,
) => Promise<unknown> | unknown;

// TODO: Compose this from plugin types
type SendMessageEvent =
  | { type: "ping"; payload: undefined }
  | { type: "getComponents"; payload: undefined }
  | { type: "updateComponents"; payload: Record<string, Component> }
  | { type: "getRenderer"; payload: string }
  // styling
  | { type: "styleSetupReady"; payload: { path: string } }
  // websocket plugin
  | { type: "reloadPage"; payload: undefined }
  | {
    type: "fileChanged";
    payload: {
      path: string;
      event: Deno.FsEvent;
      extension: string;
      name: string;
      type: string;
    };
  }
  // editor plugin
  | {
    type: "addGlobalScripts";
    payload: {
      type: string;
      src: string;
    }[];
  }
  | {
    type: "addScripts";
    payload: {
      isExternal?: boolean;
      localPath: string;
      remotePath: string;
      name: string;
      externals?: string[];
    }[];
  };

// This type is specific to breezewind-router so it probably doesn't belong here
type Routes = Record<string, Route>;
type Route = {
  context: DataContext;
  url: string;
  // TODO: This should come as an extension from the renderer plugin
  // if it is enabled
  layout: string;
  meta: Meta;
  // TODO: This should come as an extension from the script plugin
  // if it is enabled
  scripts?: { name: string }[]; // These point to scripts directory by name
  routes?: Routes;
  dataSources?: DataSource[];
  expand?: {
    matchBy?: { indexer: DataSource; processor: DataSource; slug: string };
  };
};
type Scripts = Script[];
type Script = { type: string; src: string };

type Tasks = BuildWorkerEvent[];
type BuildWorkerEvent =
  | {
    type: "init";
    payload: {
      cwd: string;
      pluginDefinitions: PluginOptions[];
      outputDirectory: string;
    };
  }
  | {
    type: "build";
    payload: {
      routes: Routes;
      route: Route;
      dir: string;
      url: string;
    };
  }
  | {
    type: "listDirectory";
    payload: { path: string; type: string };
  }
  | {
    type: "loadJSON";
    payload: { path: string; type: string };
  }
  | {
    type: "loadModule";
    payload: { path: string; type: string };
  }
  | {
    type: "readTextFile";
    payload: { path: string; type: string };
  }
  | {
    type: "writeFile";
    payload: {
      outputDirectory: string;
      file: string;
      data: string | Uint8Array;
    };
  }
  | {
    type: "writeTextFile";
    payload: {
      outputDirectory: string;
      file: string;
      data: string | Uint8Array;
    };
  }
  | {
    type: "writeFiles";
    payload: {
      inputDirectory: string;
      outputDirectory: string;
      outputPath: string;
    };
  }
  | {
    type: "writeScript";
    payload: {
      outputDirectory: string;
      file: string;
      scriptPath: string;
      externals?: string[];
    };
  };
type BuildWorkerMessageTypes = "finished" | "addTasks";

type GlobalUtilities = {
  init: ({ routes }: { routes: Routes }) => Utilities;
};

export type {
  Attributes,
  BuildWorkerEvent,
  BuildWorkerMessageTypes,
  Category,
  Context,
  DataContext,
  DataSource,
  DataSources,
  DataSourcesModule,
  GlobalUtilities,
  LoadApi,
  Meta,
  Mode,
  ParentCategory,
  Plugin,
  PluginApi,
  PluginOptions,
  PluginParameters,
  Props,
  Route,
  Routes,
  Scripts,
  Send,
  Tasks,
};
