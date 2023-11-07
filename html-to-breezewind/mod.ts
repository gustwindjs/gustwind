import htm from "https://esm.sh/htm@3.1.1";
import { isObject, omit } from "../utilities/functional.ts";
import { parseExpression } from "./utilities/parseExpression.ts";
import type { AttributeValue, Component } from "../breezewind/types.ts";

type Attributes = Component["attributes"];

const html = htm.bind(h);

function htmlToBreezewind(htmlInput: string): Component | Component[] {
  if (htmlInput.startsWith("<!") || htmlInput.startsWith("<?")) {
    // @ts-ignore Ignore for now
    const [type, attributes, ...children] = html([htmlInput]) as [
      string,
      Record<string, unknown>,
    ];
    const endsWithQuestion = attributes["?"];

    delete attributes["?"];

    // @ts-ignore Ignore for now
    return [{
      type,
      attributes,
      closingCharacter: endsWithQuestion ? "?" : "",
    }].concat(children);
  }

  // @ts-ignore Ignore for now
  return html([htmlInput]);
}

function h(
  type: string,
  attributes: Attributes, // Record<string, unknown> | null,
  ...children: Component[]
) {
  const childrenToReturn =
    children.length === 1 && typeof children[0] === "string"
      ? children[0]
      : Array.isArray(children)
      ? children
      : [children];

  if (type === "noop") {
    if (!attributes) {
      return childrenToReturn;
    }

    if (attributes["&foreach"]) {
      const filteredAttributes = filterAttributes(
        attributes === null ? {} : attributes,
      );

      return addCustomFields({
        children: childrenToReturn,
        attributes: filteredAttributes,
      }, attributes);
    }

    if (attributes["&type"]) {
      const filteredAttributes = filterAttributes(
        attributes === null ? {} : attributes,
      );
      delete filteredAttributes?.type;

      return addCustomFields({
        type: parseExpression(attributes["&type"] as string),
        children: childrenToReturn,
        attributes: filteredAttributes,
      }, attributes);
    }

    return childrenToReturn;
  }

  // Components have to map their values to props.
  // TODO: Maybe later on everything should be refactored to use attributes field.
  const isComponent = type.toUpperCase()[0] === type[0];
  const fieldName = isComponent ? "props" : "attributes";
  const filteredAttributes = filterAttributes(
    attributes === null ? {} : attributes,
    isComponent,
  );

  const ret = addCustomFields(
    {
      type,
      children: childrenToReturn,
      [fieldName]: filteredAttributes,
    },
    attributes,
    isComponent,
  );

  if (isComponent) {
    // Check possible local bindings
    const bindToProps = getLocalBindings(attributes);

    if (bindToProps) {
      // @ts-expect-error This is fine. Maybe the type can be refined.
      ret.bindToProps = bindToProps;
    }
  }

  if (
    children.length > 0 &&
    children.every((children) => children.type === "slot")
  ) {
    return {
      ...omit(ret, "children"),
      props: { ...ret.props, ...convertChildrenSlotsToProps(children) },
    };
  }

  return ret;
}

function getLocalBindings(attributes: Attributes) {
  if (isObject(attributes)) {
    // @ts-expect-error Maybe this needs a better cast to an object
    const expressionProps = Object.entries(attributes).filter(([k, v]) =>
      k.startsWith("&") && typeof v === "string"
    );

    if (!expressionProps.length) {
      return;
    }

    return Object.fromEntries(
      expressionProps.map((
        [k, v],
      ) => [k.slice(1), parseExpression(v as string)]),
    );
  }
}

function convertChildrenSlotsToProps(children: Component[]) {
  const ret: [AttributeValue, unknown][] = [];

  children.forEach((child) => {
    if (!child.attributes) {
      console.error("Slot child is missing attributes");
      console.error(child);

      return;
    }

    if (!child.attributes.name) {
      console.error("Slot child is missing name attribute");
      console.error(child);

      return;
    }

    ret.push([child.attributes.name, child.children]);
  });

  return Object.fromEntries(ret);
}

// TODO: Likely filterAttributes should be merged with this function somehow
const CUSTOM_FIELDS = ["&children", "&foreach", "&visibleIf"];
function addCustomFields(
  c: Component,
  attributes: Attributes,
  isComponent?: boolean,
): Component {
  if (!attributes) {
    return c;
  }

  const ret = CUSTOM_FIELDS.reduce((o, field) => {
    const matchedField = attributes[field];

    if (matchedField) {
      if (field === "&children") {
        return {
          ...o,
          [field.slice(1)]: isComponent
            ? []
            : parseExpression(matchedField as string),
        };
      } else if (field === "&foreach") {
        return {
          ...omit(o, "children"),
          [field.slice(1)]: [
            parseExpression(matchedField as string),
            o.children,
          ],
        };
      }

      return {
        ...o,
        [field.slice(1)]: parseExpression(matchedField as string),
      };
    }

    return o;
  }, c);

  // Class list syntax
  const initialValue: string[] = [];
  const parameters = Object.entries(attributes).reduce((attrs, [k, v]) => {
    if (!k.startsWith("&class[")) {
      return attrs;
    }

    if (attrs.length > 0) {
      attrs.push(" ");
    }

    // @ts-expect-error This is fine
    return attrs.concat(parseExpression(v as string));
  }, initialValue);

  if (parameters.length) {
    return {
      ...ret,
      attributes: {
        ...c.attributes,
        class: { utility: "concat", parameters },
      },
    };
  }

  return ret;
}

function filterAttributes(
  attributes: Attributes,
  isComponent?: boolean,
): Attributes {
  // Avoid mutating the original structure (no side effects)
  const ret: Attributes = structuredClone(attributes);

  if (!ret) {
    return {};
  }

  Object.keys(ret).forEach((key: string) => {
    // Skip comments
    if (key.startsWith("__")) {
      delete ret[key];
    } else if (key.startsWith("&")) {
      // TODO: Likely this should be done at addCustomFields
      if (
        key !== "&children" && key !== "&foreach" && key !== "&visibleIf" &&
        !key.startsWith("&class[") &&
        !isComponent
      ) {
        ret[key.slice(1)] = parseExpression(ret[key] as string);
      }

      delete ret[key];
    }
  });

  return ret;
}

export { htmlToBreezewind };
