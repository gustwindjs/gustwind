import { isObject } from "./deps.ts";

type Props = Record<string, string | undefined>;
type Attributes = Record<string, string | undefined>;
type Component = {
  element: string; // TODO: Only valid DOM elements and components
  as?: string; // TODO: Only valid DOM elements
  children?: string | Component[];
  class?: string | ((props?: Props) => string);
  props?: Props;
  attributes?: Attributes | ((props?: Props) => Attributes);
};

const codeContainer: Component = {
  element: "box",
  as: "section",
  attributes: (props) => ({
    "x-label": "codeEditor",
    "x-state": props?.state,
  }),
};

const codeEditor: Component = {
  element: "box",
  class: "rounded-t-lg overflow-x-auto overflow-y-hidden",
  children: [
    {
      element: "box",
      children: [
        {
          element: "box",
          as: "span",
          children: "Editor",
        },
      ],
    },
    {
      element: "box",
      class: "inline-block font-mono relative",
      children: [
        {
          element: "box",
          class: "mr-16 pr-16 w-full overflow-hidden",
          attributes: (props) => ({
            x: `Prism.highlight(${props?.parent}.${props
              ?.value} || '', Prism.languages.tsx, 'tsx')`,
          }),
        },
        {
          element: "textarea",
          class:
            "overflow-hidden absolute min-w-full top-0 left-0 outline-none opacity-50 bg-none whitespace-pre resize-none",
          attributes: (props) => ({
            oninput: `setState({ ${props?.value}: this.value }, { parent: ${
              props?.parent === "this" ? "this" : "'" + props?.parent + "'"
            } })`,
            x: `${props?.parent}.${props?.value}`,
            autocapitalize: "off",
            autocomplete: "off",
            autocorrect: "off",
            spellcheck: "false",
            "x-rows": `${props?.parent}.${props?.value}?.split('\\n').length`,
          }),
        },
      ],
    },
  ],
};

const box: Component = {
  element: "div",
};

const flex: Component = {
  element: "box",
  class: (props) =>
    `flex ${
      convertToClasses(
        "flex",
        (mediaQuery, prefix, v) =>
          `${mediaQuery ? mediaQuery + ":" : ""}${prefix}-${
            v === "column" ? "col" : "row"
          }`,
      )(props?.direction)
    } ${(props?.sx && props.sx) || ""}`.trim(),
};

const stack: Component = {
  element: "flex",
  class: (props) =>
    `flex ${
      convertToClasses(
        "flex",
        (mediaQuery, prefix, v) =>
          `${mediaQuery ? mediaQuery + ":" : ""}${prefix}-${
            v === "column" ? "col" : "row"
          }`,
      )(props?.direction)
    } ${
      parseSpacingClass(
        props?.direction,
        props?.spacing,
      )
    } ${(props?.sx && props.sx) || ""}`.trim(),
};

function parseSpacingClass(
  direction?: string,
  spacing?: string,
) {
  if (!spacing) {
    return "";
  }

  return convertToClasses("space", (mediaQuery, prefix, direction) => {
    const klass = `${mediaQuery ? mediaQuery + ":" : ""}${prefix}-${
      direction === "row" ? "x" : "y"
    }-${spacing}`;
    const inverseClass = `${mediaQuery ? mediaQuery + ":" : ""}${prefix}-${
      direction === "row" ? "y" : "x"
    }-0`;

    return `${klass} ${inverseClass}`;
  })(direction);
}

function convertToClasses(prefix: string, customizeValue = defaultValue) {
  // deno-lint-ignore no-explicit-any
  return (value?: any) => {
    if (!value) {
      return "";
    }

    if (isObject(value)) {
      return Object.entries(value).map(([k, v]) =>
        customizeValue(k === "default" ? "" : k, prefix, v as string)
      );
    }

    return customizeValue("", prefix, value);
  };
}

function defaultValue(
  mediaQuery: string,
  prefix: string,
  value: string | number,
) {
  return `${mediaQuery ? mediaQuery + ":" : ""}${prefix}-${value}`;
}

export type { Attributes, Component };
export { box, codeContainer, codeEditor, flex, stack };
