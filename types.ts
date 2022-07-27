import type { Component as BreezeComponent } from "./breezewind/types.ts";

// This should match with ./transforms
type Transform = "markdown" | "reverse";

type Props = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
type Attributes = Record<string, any>;
type Component = BreezeComponent | BreezeComponent[];
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
  dataSources?: string[];
  expand?: {
    matchBy?: { dataSource: string; collection?: string; slug: string };
  };
  // These are attached later
  context?: DataContext;
  url?: string;
};
type Scripts = { type: string; src: string }[];
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
    twindSetup?: string;
  };
  features?: {
    extractCSS?: boolean;
    showEditorAlways?: boolean;
  };
};

type Layout = Component;
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
  DataSources,
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
