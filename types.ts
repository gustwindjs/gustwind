type Props = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
type Attributes = Record<string, any>;
type Component = {
  component?: string;
  element?: string; // TODO: Only valid DOM element names
  children?: string | Component[];
  class?: string;
  attributes?: Attributes;
  transformWith?: "markdown";
  // Data bindings
  __bind?: string;
  __class?: string;
  __children?: string | Component[];
  __foreach?: {
    field: string;
    render: string | Component[];
  };
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
  id: string;
  title: string;
  shortTitle: string;
  slug: string;
  date: string;
  type: "comparison" | "interview" | "rating" | "static";
  user: string;
  includes?: string[];
  body: string;
  footer?: string;
  table?: Record<string, string[]>;
  profile?: {
    name: string;
    twitter: string;
    github: string;
    bio: string;
    photo: string;
  };
};
type SiteMeta = { siteName: string };
type Page = {
  meta: Meta;
  page: Component | Component[];
  matchBy?: { dataSource: string; field: string };
  dataSources?: { name: string; transformWith: string }[];
};
type Meta = Record<string, string>;

export type {
  Attributes,
  BlogPost,
  Category,
  Component,
  Components,
  DataContext,
  Library,
  Meta,
  Page,
  ParentCategory,
  Props,
  SiteMeta,
};
