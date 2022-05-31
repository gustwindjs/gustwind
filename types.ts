// This should match with ./transforms
type Transform = "markdown" | "reverse";

type Props = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
type Attributes = Record<string, any>;
type Component = {
  visibleIf?: string; // A string to evaluate to figure out if to render an element at all
  element?: string; // TODO: Only valid DOM element names + components
  children?: string | Component[];
  class?: string;
  inputProperty?: string;
  inputText?: string;
  attributes?: Attributes;
  transformWith?: Transform[];
  // Data bindings
  __bind?: string;
  __class?: string;
  __children?: string | Component[];
  "==children"?: string;
  __foreach?: [string, Component[]];
  // Page editor - TODO: Consider decoupling this somehow
  // maybe there can be an "enhanced" structure that's adding the id?
  _id?: string;
};
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
    dataSources?: DataSource[];
    matchBy?: { dataSource: string; collection?: string; slug: string };
  };
  // These are attached later
  context?: DataContext;
  url?: string;
};
type DataSource = {
  id: string;
  operation: string;
  input: string;
  transformWith: Transform[];
  // The only valid values are names of other operations here
  dependsOn?: string[];
};
type Scripts = { type: string; src: string }[];

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
    scripts?: string;
    transforms: string;
    pageUtilities?: string;
    twindSetup?: string;
  };
  features?: {
    extractCSS?: boolean;
    showEditorAlways?: boolean;
  };
};

type Layout = {
  head?: Component[];
  body: Component[];
};
type Meta = Record<string, string>;
type Mode = "development" | "production";
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
      dir: string;
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

export type {
  Attributes,
  BuildWorkerEvent,
  Category,
  Component,
  Components,
  DataContext,
  DataSource,
  Layout,
  Library,
  MarkdownWithFrontmatter,
  Meta,
  Mode,
  ParentCategory,
  ProjectMeta,
  Props,
  Route,
  Scripts,
  Transform,
};
