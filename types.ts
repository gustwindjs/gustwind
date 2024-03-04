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

type LoadedPlugin = {
  plugin: { meta: Plugin["meta"]; api: PluginApi; context: Context };
  tasks: Tasks;
};
type PluginsDefinition = {
  env: Record<string, string>;
  plugins: PluginOptions[];
};
type PluginOptions = {
  // The idea is that the consumer can provide an already loaded module. This
  // is needed for environments like the browser or edge computing platforms.
  module: Plugin;
  path: never;
  options: Record<string, unknown>;
} | {
  module: never;
  path: string;
  options: Record<string, unknown>;
};

type Meta = Record<string, string>;
type Mode = "development" | "production";

// This is the context used when rendering a page
type Context = Record<string, unknown>;

// TODO: Rename as PluginModule for clarity
type Plugin<O = Record<string, unknown>, C = Context> = {
  meta: {
    name: string;
    description: string;
    dependsOn?: string[];
  };
  init(args: PluginParameters<O>): Promise<PluginApi<C>> | PluginApi<C>;
};

type PluginParameters<O = Record<string, unknown>> = {
  cwd: string;
  load: LoadApi;
  mode: Mode;
  outputDirectory: string;
  options: O;
};

type InitLoadApi = (tasks: Tasks) => LoadApi;
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

type PluginApi<C = Context> = {
  // Set up initial plugin context during plugin initialization phase.
  initPluginContext?(): C | Promise<C>;
  // Send messages to other plugins before other hooks are applied. This
  // is useful for giving specific instructions on what to do.
  sendMessages?(
    { send, pluginContext }: { send: Send; pluginContext: C },
  ): Promise<Tasks | void> | Tasks | void;
  // Return additional tasks to perform per build preparation
  prepareBuild?(
    { send, pluginContext }: { send: Send; pluginContext: C },
  ): Promise<Tasks | void> | Tasks | void;
  // Return additional tasks to perform per build finishing
  finishBuild?(
    { send, pluginContext }: { send: Send; pluginContext: C },
  ): Promise<Tasks | void> | Tasks | void;
  // Optional cleanup for global operations that should happen only once per process
  cleanUp?(
    { routes, pluginContext }: { routes: Routes; pluginContext: C },
  ): void;
  // Run setup before context is resolved or add something to it
  prepareContext?(
    { send, route, url, pluginContext }: {
      send: Send;
      route: Route;
      url: string;
      pluginContext: C;
    },
  ):
    | Promise<{ context: Record<string, unknown> } | void>
    | {
      context: Record<string, unknown>;
    }
    | void;
  beforeEachRender?(
    { context, send, route, url, pluginContext }: {
      context: Context;
      send: Send;
      route: Route;
      url: string;
      pluginContext: C;
    },
  ):
    | Promise<
      Tasks | void
    >
    | Tasks
    | void;
  render?({ routes, route, context, send, url, pluginContext }: {
    routes: Routes;
    route: Route;
    context: Context;
    send: Send;
    url: string;
    pluginContext: C;
  }): Promise<string> | string;
  afterEachRender?({ markup, context, route, send, url, pluginContext }: {
    markup: string;
    context: Context;
    route: Route;
    send: Send;
    url: string;
    pluginContext: C;
  }): Promise<{ markup: string }> | { markup: string };
  onMessage?(
    { message, pluginContext }: { message: SendMessageEvent; pluginContext: C },
  ):
    | void
    | {
      send?: SendMessageEvent[];
      pluginContext?: Partial<C>;
      result?: unknown;
    }
    | Promise<
      void | {
        send?: SendMessageEvent[];
        pluginContext?: Partial<C>;
        result?: unknown;
      }
    >;
  getAllRoutes?({ pluginContext }: { pluginContext: C }):
    | Promise<{ routes: Record<string, Route>; tasks: Tasks }>
    | { routes: Record<string, Route>; tasks: Tasks };
  matchRoute?(
    allRoutes: Routes,
    url: string,
    pluginContext: C,
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
// TODO: Model an accurate return type for each event (fixes plugins.ts a lot)
type SendMessageEvent =
  | { type: "ping"; payload: undefined }
  | { type: "getStyleSetupPath"; payload: undefined }
  | { type: "getMeta"; payload: undefined }
  | { type: "getComponents"; payload: undefined }
  | { type: "updateComponents"; payload: Record<string, Component> }
  | { type: "getRenderer"; payload: string }
  // websocket plugin
  | { type: "reloadPage"; payload: undefined }
  | {
    type: "fileChanged";
    payload: {
      path: string;
      // Duplicated from Deno type to avoid shimming with dnt
      // event: Deno.FsEvent;
      event: {
        /** The kind/type of the file system event. */
        kind: "any" | "access" | "create" | "modify" | "remove" | "other";
        /** An array of paths that are associated with the file system event. */
        paths: string[];
        /** Any additional flags associated with the event. */
        flag?: "rescan";
      };
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
    matchBy?: {
      indexer: DataSource;
      dataSources: DataSource[];
      slug: string;
    };
  };
};
type Scripts = Script[];
type Script = { type: string; src: string };

type Tasks = (BuildWorkerEvent)[];
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
    type: "copyFiles";
    payload: {
      inputDirectory: string;
      outputDirectory: string;
      outputPath: string;
    };
  };
type BuildWorkerMessageTypes = "finished" | "addTasks";

type GlobalUtilities = {
  init: ({ routes }: { routes: Routes }) => Utilities;
};

type Components = Record<string, ComponentsEntry>;
type ComponentsEntry = {
  component: string; // Initially HTML but converted later to a Component
  utilities?: GlobalUtilities;
  utilitiesPath: string;
};

export type {
  Attributes,
  BuildWorkerEvent,
  BuildWorkerMessageTypes,
  Category,
  Components,
  ComponentsEntry,
  Context,
  DataContext,
  DataSource,
  DataSources,
  DataSourcesModule,
  GlobalUtilities,
  InitLoadApi,
  LoadApi,
  LoadedPlugin,
  Meta,
  Mode,
  ParentCategory,
  Plugin,
  PluginApi,
  PluginOptions,
  PluginParameters,
  PluginsDefinition,
  Props,
  Route,
  Routes,
  Scripts,
  Send,
  Tasks,
};
