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

type ProjectMeta = {
  port: number;
  amountOfBuildThreads: number | "cpuMax" | "cpuHalf";
  meta: Meta;
  outputDirectory: string;
  router: PluginOptions;
  plugins: PluginOptions[];
};

type PluginOptions = { path: string; options: Record<string, unknown> };

type Meta = Record<string, string>;
type Mode = "development" | "production";

// This is the context used when rendering a page
type Context = Record<string, unknown> & {
  pagePath: string;
  projectMeta: ProjectMeta;
  meta?: Record<string, unknown>;
};

type PluginModule = {
  meta: PluginMeta;
  plugin: Plugin;
};

type PluginMeta = {
  name: string;
  dependsOn?: string[];
};

type Plugin = {
  // Send messages to other plugins before other hooks are applied. This
  // is useful for giving specific instructions on what to do.
  sendMessages?({ send }: { send: Send }): Promise<Tasks> | Tasks | void;
  // Return additional tasks to perform per build
  prepareBuild?({ send }: { send: Send }): Promise<Tasks> | Tasks | void;
  // Run setup before context is resolved or add something to it
  prepareContext?({ send, route }: { send: Send; route: Route }):
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
  onMessage?(message: SendMessage): void;
  getAllRoutes?(): Promise<Record<string, Route>>;
  matchRoute?(url: string): Promise<Route | undefined> | Route | undefined;
};

type Send = (
  pluginName: string,
  { type, payload }: SendMessage,
) => Promise<unknown> | unknown;
type SendMessage = { type: string; payload?: unknown };

type Route = {
  type?: "html" | "xml";
  // TODO: This should come as an extension from the renderer plugin
  // if it is enabled
  layout: string;
  meta: Meta;
  // TODO: This should come as an extension from the script plugin
  // if it is enabled
  scripts?: Scripts;
  routes?: Record<string, Route>;
  dataSources?: DataSource[];
  expand?: {
    matchBy?: { dataSource: DataSource; slug: string };
  };
  // These are attached later
  context?: DataContext;
  url?: string;
};
type Scripts = Script[];
type Script = { type: string; src: string };

type Tasks = BuildWorkerEvent[];

type BuildWorkerEvent =
  | {
    type: "init";
    payload: { projectMeta: ProjectMeta };
  }
  | {
    type: "build";
    payload: {
      route: Route;
      pagePath: string;
      dir: string;
      url: string;
    };
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
      scriptName: string;
      scriptPath?: string;
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
  PluginMeta,
  PluginModule,
  PluginOptions,
  ProjectMeta,
  Props,
  Route,
  Scripts,
  Send,
  Tasks,
};
