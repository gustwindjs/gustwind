// This should match with ./transforms
type Transform = "markdown" | "reverse";

type Props = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
type Attributes = Record<string, any>;
type Component = {
  element: string; // TODO: Only valid DOM element names + components
  children?: string | Component[];
  class?: string;
  attributes?: Attributes;
  transformWith?: Transform[];
  // Data bindings
  __bind?: string;
  __class?: string;
  __children?: string | Component[];
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
type BlogPost = {
  data: {
    slug: string;
    title: string;
    date: Date;
    keywords: string[];
  };
  content: string;
};
type SiteMeta = {
  siteName: string;
};
type ProjectMeta = {
  developmentPort: number;
  meta: SiteMeta;
  paths: {
    components: string;
    importMap: string;
    output: string;
    pages: string;
    scripts: string;
    transforms: string;
  };
  browserDependencies?: string[];
};
type DataSources = {
  id: string;
  operation: string;
  input: string;
  transformWith: Transform[];
}[];
type Page = {
  meta: Meta;
  page: Component | Component[];
  matchBy?: { dataSource: string; property: string };
  dataSources?: DataSources;
};
type Meta = Record<string, string>;
type Mode = "development" | "production";
type ImportMap = { imports: Record<string, string> };

export type {
  Attributes,
  BlogPost,
  Category,
  Component,
  Components,
  DataContext,
  DataSources,
  ImportMap,
  Library,
  Meta,
  Mode,
  Page,
  ParentCategory,
  ProjectMeta,
  Props,
  SiteMeta,
  Transform,
};
