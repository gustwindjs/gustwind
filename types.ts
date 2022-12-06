import type { Component, Utilities } from "./breezewind/types.ts";
import type { ServeCache } from "./gustwind-server/cache.ts";

// This should match with ./transforms
type Transform = "markdown" | "reverse";

type Props = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
type Attributes = Record<string, any>;
type Components = Record<string, Component>;
type Category = { id: string; title: string; url: string };
type Library = {
  id: string;
  description: string;
  logo?: string;
  name: string;
  links: {
    site?: string;
    github?: string;
  };
  tags: string[];
};
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

type Route = {
  type?: "html" | "xml";
  layout?: string;
  meta: Meta;
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
type DataSource = { operation: string; name: string; parameters?: unknown[] };
type DataSources = Record<string, () => unknown[]>;

type ProjectMeta = {
  port: number;
  amountOfBuildThreads: number | "cpuMax" | "cpuHalf";
  scripts?: Scripts;
  meta: Meta;
  paths: {
    assets?: string;
    components: string;
    dataSources: string;
    layouts: string;
    output: string;
    routes: string;
    scripts?: string[];
    transforms: string;
    pageUtilities?: string;
  };
  renderer: PluginOptions;
  plugins: PluginOptions[];
};

type PluginOptions = { path: string; options: Record<string, unknown> };

type Meta = Record<string, string>;
type Mode = "development" | "production";
type Layout = Component | Component[];

// This is the context used when rendering a page. It's also the type
// pageUtilities should consume.
type Context = Record<string, unknown> & {
  pagePath: string;
  projectMeta: ProjectMeta;
  scripts: Scripts;
  meta?: Record<string, unknown>;
};

type Renderer = {
  render({ layout, components, context, pageUtilities }: {
    layout: Layout;
    components: Components;
    context: Context | {};
    pageUtilities: Utilities;
  }): Promise<string> | string;
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
  beforeEachContext?(): void;
  beforeEachRequest?(
    { url, respond }: {
      url: string;
      respond: (status: number, text: string, type: string) => void;
    },
  ): void;
  beforeEachMatchedRequest?(
    { cache, route }: { cache: ServeCache; route: Route },
  ): Promise<Partial<ServeCache>> | (Partial<ServeCache>);
  beforeEachRender?(
    { context, layout, route, url }: {
      context: Context;
      layout: Layout;
      route: Route;
      url: string;
    },
  ):
    | Promise<
      {
        tasks?: Tasks;
        scripts?: Scripts;
      } | void
    >
    | {
      tasks?: Tasks;
      scripts?: Scripts;
    }
    | void;
  afterEachRender?({ markup, layout, context, route, url }: {
    markup: string;
    layout: Layout;
    context: Context;
    route: Route;
    url: string;
  }): Promise<{ markup: string }> | { markup: string };
  prepareBuild?(
    { components }: { components: Components },
  ): Promise<Tasks> | Tasks;
};

type Tasks = BuildWorkerEvent[];

type BuildWorkerEvent =
  | {
    type: "init";
    payload: { components: Components; projectMeta: ProjectMeta };
  }
  | {
    type: "build";
    payload: {
      layout: Layout;
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
    type: "writeScript";
    payload: {
      outputDirectory: string;
      scriptName: string;
      scriptPath?: string;
    };
  }
  | {
    type: "writeAssets";
    payload: {
      outputPath: string;
      assetsPath: ProjectMeta["paths"]["assets"];
    };
  };

type BuildWorkerMessageTypes = "finished" | "addTasks";

export type {
  Attributes,
  BuildWorkerEvent,
  BuildWorkerMessageTypes,
  Category,
  Components,
  Context,
  DataContext,
  DataSource,
  DataSources,
  Layout,
  Library,
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
  Renderer,
  Route,
  Scripts,
  Tasks,
  Transform,
};
