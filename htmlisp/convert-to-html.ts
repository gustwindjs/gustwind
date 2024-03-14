import { isString, omit } from "../utilities/functional.ts";
import { parseExpressions } from "./utilities/parseExpressions.ts";
import { parseExpression } from "./utilities/parseExpression.ts";
import { defaultUtilities } from "../breezewind/defaultUtilities.ts";
import { applyUtility } from "../breezewind/applyUtility.ts";
import type { Utilities, Utility } from "../breezewind/types.ts";
import type { Attributes, Components, Context } from "./types.ts";

type HtmllispToHTMLParameters = {
  htmlInput?: string;
  components?: Components;
  context?: Context;
  props?: Context;
  utilities?: Utilities;
  evaluateProps?: boolean;
};

const defaultComponents = {
  // TODO: Figure out a good pattern for passing arbitrary attributes to noop
  Foreach:
    `<noop &type="(get props type)" &children="(render (get props values) (get props children))"></noop>`,
};

function getConverter(
  htm: { bind: (hValue: ReturnType<typeof getH>) => string },
) {
  return function htmlispToHTML(
    { htmlInput, components, context, props, utilities, evaluateProps }:
      HtmllispToHTMLParameters,
  ): string {
    if (!htmlInput) {
      throw new Error("convert - Missing html input");
    }

    if (!isString(htmlInput)) {
      throw new Error("convert - html input was not a string");
    }

    if (htmlInput.startsWith("<!") || htmlInput.startsWith("<?")) {
      return htmlInput;
    }

    const convertToHTML = getConvertToHTML(
      {
        ...defaultComponents,
        ...components,
      },
      context || {},
      props || {},
      // @ts-expect-error TODO: Figure out what's wrong with this type
      {
        ...defaultUtilities,
        ...utilities,
      },
      htmlispToHTML,
      evaluateProps,
    );

    // TODO
    return convertToHTML(htmlInput);

    /*
    const html = htm.bind(
      getH(
        {
          ...defaultComponents,
          ...components,
        },
        context || {},
        props || {},
        // @ts-expect-error TODO: Figure out what's wrong with this type
        {
          ...defaultUtilities,
          ...utilities,
        },
        htmlispToHTML,
        evaluateProps,
      ),
    );

    // @ts-ignore Ignore for now
    return html([htmlInput]);
    */
  };
}
/*
const NOT_PARSING = 0;
const PARSE_TAG_START = 1;
const PARSE_BODY = 2;
const PARSE_ATTRIBUTE_NAME = 3;
const PARSE_ATTRIBUTE_VALUE = 4;
const PARSE_TAG_END = 5;
*/

// Debug helpers
const NOT_PARSING = "not parsing";
const PARSE_TAG_START = "parse tag start";
const PARSE_BODY = "parse body";
const PARSE_ATTRIBUTE_NAME = "parse attribute name";
const PARSE_ATTRIBUTE_VALUE = "parse attribute value";
const PARSE_TAG_END = "parse tag end";

function getConvertToHTML(
  components: Components,
  context: Context,
  props: Context,
  utilities: Utilities,
  htmlispToHTML: (args: HtmllispToHTMLParameters) => string,
  evaluateProps: boolean,
) {
  return function convert(input: string) {
    const ret: string[] = [];
    let parsingState = NOT_PARSING;
    let quotesFound = 0;
    let capturedTag: {
      name: string;
      // TODO: Generalize
      attributeName: string;
      attributeValue: string;
      // TODO: Potentially add children here
      body: string;
    } = { name: "", attributeName: "", attributeValue: "", body: "" };
    const capturedTags = [];

    for (let i = 0; i < input.length; i++) {
      const c = input[i];

      // Debug helper
      // console.log(parsingState, c);

      if (parsingState === NOT_PARSING) {
        if (c === "<") {
          parsingState = PARSE_TAG_START;
        } else if (c === ">") {
          parsingState = PARSE_BODY;
        }
      } else if (parsingState === PARSE_TAG_START) {
        if (c === ">") {
          parsingState = PARSE_BODY;
        } else if (c === " ") {
          parsingState = PARSE_ATTRIBUTE_NAME;
        } else {
          capturedTag.name += c;
        }
      } else if (parsingState === PARSE_ATTRIBUTE_NAME) {
        if (c === "=") {
          parsingState = PARSE_ATTRIBUTE_VALUE;
        } else {
          capturedTag.attributeName += c;
        }
      } else if (parsingState === PARSE_ATTRIBUTE_VALUE) {
        if (c === '"') {
          quotesFound++;

          if (quotesFound === 2) {
            parsingState = NOT_PARSING;
            quotesFound = 0;
          }
        } else {
          capturedTag.attributeValue += c;
        }
      } else if (parsingState === PARSE_BODY) {
        if (c === "<") {
          parsingState = PARSE_TAG_END;
        } else {
          capturedTag.body += c;
        }
      } else if (parsingState === PARSE_TAG_END) {
        if (c === ">") {
          parsingState = NOT_PARSING;
          capturedTags.push(structuredClone(capturedTag));
          capturedTag = {
            name: "",
            attributeName: "",
            attributeValue: "",
            body: "",
          };
          quotesFound = 0;

          // TODO: This would be the spot to convert already most likely
        }
      }
    }

    // TODO: Comment - __ - potentially this could be done when committing
    console.log(capturedTags);

    return ret.join("");
  };
}

function getH(
  components: Components,
  context: Context,
  props: Context,
  utilities: Utilities,
  htmlispToHTML: (args: HtmllispToHTMLParameters) => string,
  evaluateProps: boolean,
) {
  return async function h(
    type: string,
    attributes: Attributes,
    ...children: string[]
  ) {
    // Components begin with an uppercase letter always
    if (type[0].toUpperCase() === type[0]) {
      const foundComponent = components[type];

      if (foundComponent) {
        let additionalProps = {};
        let awaitedChildren = [""];

        // Due to iteration order htm goes to the branches first
        // and those will be missing props. The code below works
        // around the problem by trying again.
        try {
          awaitedChildren = await Promise.all(children);
        } catch (_error) {
          // Nothing to do
        }

        // Children are slots if the results was an array of tuples
        if (
          Array.isArray(awaitedChildren) && awaitedChildren[0]?.length === 2
        ) {
          // @ts-expect-error This is fine
          additionalProps = Object.fromEntries(awaitedChildren);
          awaitedChildren = [""];
        }

        const render = async (values: Context[], htmlInput: string) =>
          (
            await Promise.all(
              values.map((props) =>
                htmlispToHTML({
                  htmlInput,
                  components,
                  context,
                  props,
                  utilities,
                  evaluateProps: true,
                })
              ),
            )
          ).join("");

        return htmlispToHTML({
          htmlInput: foundComponent,
          components,
          context,
          props: {
            children: awaitedChildren.join(""),
            ...additionalProps,
            ...attributes,
            ...await parseExpressions(
              attributes,
              context,
              props,
              {
                ...utilities,
                render,
              },
              evaluateProps,
            ),
          },
          utilities: { ...utilities, render },
          evaluateProps,
        });
      }

      throw new Error(`Component "${type}" was not found!`);
    }

    if (attributes?.["&visibleIf"]) {
      const showElement = await applyUtility<Utility, Utilities, Context>(
        parseExpression(attributes["&visibleIf"]),
        utilities,
        { context },
      );

      if (!showElement) {
        return "";
      }
    }

    const parsedExpressions = await parseExpressions(
      attributes,
      context,
      props,
      utilities,
      evaluateProps,
    );

    const attrs = await getAttributeBindings(
      omit(omit(parsedExpressions, "children"), "type"),
    );

    if (attributes?.["&children"]) {
      children = await applyUtility<Utility, Utilities, Context>(
        parseExpression(attributes["&children"]),
        utilities,
        { context, props },
      );
    }

    if (attributes?.["#children"]) {
      children = await applyUtility<Utility, Utilities, Context>(
        parseExpression(attributes["#children"]),
        utilities,
        { context, props },
      );
    }

    const content = (children && (await Promise.all(children)).join("")) || "";

    if (type === "slot") {
      const name = attributes?.name;

      if (!name) {
        throw new Error(`Slot is missing a name!`);
      }

      return [name, content];
    }

    if (!parsedExpressions.type && type === "noop") {
      return content;
    }

    const t = parsedExpressions.type || type;

    return `<${t}${attrs && " " + attrs}>${content}</${t}>`;
  };
}

function getAttributeBindings(
  parsedExpressions: Awaited<ReturnType<typeof parseExpressions>>,
) {
  return Object.entries(parsedExpressions).map(([k, v]) => `${k}="${v}"`)
    .join(" ");
}

export { getConverter };
