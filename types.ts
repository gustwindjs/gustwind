// This should match with ./transforms
type Transform = "markdown" | "reverse";

type Props = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
type Attributes = Record<string, any>;
type Component = {
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
type ProjectMeta = {
  developmentPort: number;
  amountOfBuildThreads: number | "cpuMax";
  siteName: string;
  language: string;
  paths: {
    assets?: string;
    dataSources: string;
    components: string;
    output: string;
    pages: string;
    scripts?: string;
    transforms: string;
    twindSetup?: string;
  };
  scripts?: { type: string; src: string }[];
  features?: {
    showEditorAlways?: boolean;
  };
};
type DataSources = {
  id: string;
  operation: string;
  input: string;
  transformWith: Transform[];
}[];
type Page = {
  layout?: "html" | "xml";
  meta: Meta;
  head: Component[];
  body: Component[];
  matchBy?: { dataSource: string; collection: string; property: string };
  dataSources?: DataSources;
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
      route: string;
      filePath: string;
      dir: string;
      extraContext: DataContext;
      page: Page;
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
  DataSources,
  Library,
  MarkdownWithFrontmatter,
  Meta,
  Mode,
  Page,
  ParentCategory,
  ProjectMeta,
  Props,
  Transform,
};
