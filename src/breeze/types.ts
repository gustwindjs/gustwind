type Component = {
  element?: string;
  children?: string | Component[];
  attributes?: Record<string, string>;
};
type Extension = (component: Component) => string;

export type { Component, Extension };
