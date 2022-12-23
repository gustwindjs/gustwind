// TODO: Too specific
import type { Component } from "./breezewind/types.ts";

type Props = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
type Attributes = Record<string, any>;
type Category = { id: string; title: string; url: string };

type DataContext = Record<string, unknown> | Record<string, unknown>[];
type ParentCategory = { title: string; children: Category[] };
type MarkdownWithFrontmatter = {
  data: {
    slug: string;
    title: string;
    date: Date;
    keywords: string[];
  };
  content: string;
};

type DataSource = { operation: string; name: string; parameters?: unknown[] };
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
  load: {
    dir({ path, extension, recursive }: {
      path: string;
      extension?: string;
      recursive?: boolean;
    }): Promise<{ name: string; path: string }[]>;
    json<T>(path: string): Promise<T>;
    module<T>(path: string): Promise<T>;
  };
  mode: Mode;
  outputDirectory: string;
  options: O;
};

type PluginApi = {
  // Send messages to other plugins before other hooks are applied. This
  // is useful for giving specific instructions on what to do.
  sendMessages?({ send }: { send: Send }): Promise<Tasks> | Tasks | void;
  // Return additional tasks to perform per build
  prepareBuild?({ send }: { send: Send }): Promise<Tasks> | Tasks | void;
  // Run setup before context is resolved or add something to it
  prepareContext?(
    { send, route, url }: { send: Send; route: Route; url: string },
  ):
    | Promise<{ context: Record<string, unknown> }>
    | Promise<void>
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
  render?({ route, context, send, url }: {
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
  onMessage?(message: SendMessageEvent): void;
  getAllRoutes?(): Promise<Record<string, Route>> | Record<string, Route>;
  matchRoute?(
    url: string,
  ): Promise<{ route?: Route; tasks: Tasks }> | {
    route?: Route;
    tasks: Tasks;
  };
  onTasksRegistered?({ send, tasks }: { tasks: Tasks; send: Send }): void;
};

type Send = (
  pluginName: string,
  { type, payload }: SendMessageEvent,
) => Promise<unknown> | unknown;

// TODO: Compose this from plugin types
type SendMessageEvent =
  // editor plugin
  | {
    type: "addScripts";
    payload: { localPath: string; remotePath: string; name: string }[];
  }
  | { type: "getComponents"; payload: undefined }
  | {
    type: "updateComponents";
    payload: Component;
  }
  | { type: "getRenderer"; payload: string }
  | { type: "getLayouts"; payload: undefined }
  | { type: "updateLayouts"; payload: Component }
  // websocket plugin
  | {
    type: "fileChanged";
    payload: {
      path: string;
      event: Deno.FsEvent;
      extension: string;
      name: string;
    };
  };

// This type is specific to breezewind-router so it probably doesn't belong here
type Route = {
  context: DataContext;
  url: string;
  // TODO: This should come as an extension from the renderer plugin
  // if it is enabled
  layout: string;
  meta: Meta;
  // TODO: This should come as an extension from the script plugin
  // if it is enabled
  scripts?: string[]; // These point to scripts directory by name
  routes?: Record<string, Route>;
  dataSources?: DataSource[];
  expand?: {
    matchBy?: { dataSource: DataSource; slug: string };
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
      route: Route;
      dir: string;
      url: string;
    };
  }
  | {
    type: "listDirectory";
    payload: { path: string };
  }
  | {
    type: "loadJSON";
    payload: { path: string };
  }
  | {
    type: "loadModule";
    payload: { path: string };
  }
  | {
    type: "watchPaths";
    payload: { paths: string[] };
  }
  | {
    type: "writeFile";
    payload: {
      outputDirectory: string;
      file: string;
      data: string;
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
    };
  };
type BuildWorkerMessageTypes = "finished" | "addTasks";

export type {
  Attributes,
  BuildWorkerEvent,
  BuildWorkerMessageTypes,
  Category,
  Context,
  DataContext,
  DataSource,
  DataSources,
  MarkdownWithFrontmatter,
  Meta,
  Mode,
  ParentCategory,
  Plugin,
  PluginApi,
  PluginOptions,
  PluginParameters,
  Props,
  Route,
  Scripts,
  Send,
  Tasks,
};
