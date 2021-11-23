---
slug: 'concepts'
title: 'Concepts'
---
You'll learn how different concepts of Gustwind go together on this page. It's self-similar in many ways and if you are familiar with technologies such as HTML, Tailwind, or React, likely you'll get used to it fast.

At its core, the page engine is an interpolating template interpreter that allows data binding. That means there's special syntax for connecting data with your pages and components. The data binding itself happens at [routing level](/routing/) and here we focus on the component and layout level.

## Components

To give you a simple example of a component, consider the following example for a link that is able to bold itself if it's matching to the path of the current page:

**components/Link.json**

```json
{
  "element": "a",
  "class": "underline",
  "__class": {
    "font-bold": "attributes.href === context.pathname"
  }
}
```

The styling semantics are based on [Tailwind](https://tailwindcss.com/) but you can see there's also data binding going on at `__class`. That `__` means the field should be evaluated and in this case we'll check if the `href` attribute passed to the link is matching to the current path. In short, this is how you would bold the the link to signify it's the current page.

A navigation component built on top of `link` could look like this:

**components/Navigation.json**

```json
[
  {
    "element": "Link",
    "children": "Blog",
    "attributes": {
      "href": "/blog/"
    }
  },
  {
    "element": "Link",
    "children": "About",
    "attributes": {
      "href": "/about/"
    }
  }
]
```

To build a subscription widget, you would do something along this:

**components/Subscribe.json**

```json
{
  "element": "button",
  "children": "Subscribe to the mailing list",
  "attributes": {
    "onclick": "subscribe()"
  }
}
```

The same idea of binding works for `children`. You can bind to the children of an element using `__children`. I.e. `"__children": "Link"` would bind the value of the `link` property to `children`. Consider the example below:

**components/Libraries.json**

```json
{
  "element": "ul",
  "class": "grid grid-cols-3 gap-8",
  "__children": [
    {
      "element": "li",
      "class": "my-4",
      "children": [
        {
          "element": "Link",
          "class": "w-full bg-gray-200 text-gray-800 p-4",
          "__children": "title",
          "attributes": {
            "__href": "url"
          }
        }
      ]
    }
  ]
}
```

In order to bind data, `__bind` has to be used. To bind `libraries` to the component above, you could do the following:

```json
{
  "element": "AllLibraries",
  "__bind": "libraries"
}
```

In addition to binding data from a source, you can do static bindings to pass data to components:

```json
{
  "element": "GitHubCorner",
  "__bind": {
    "url": "https://github.com/survivejs/gustwind"
  }
}
```

To apply an interpolation, i.e. combining data at the field level, there's `==` syntax:

**layouts/blogIndex.json**

```json
{
  "element": "div",
  "class": "md:mx-auto my-8 px-4 md:px-0 w-full lg:max-w-3xl prose lg:prose-xl",
  "__bind": "blogPosts.content",
  "children": [
    {
      "element": "ul",
      "__children": [
        {
          "element": "li",
          "class": "inline",
          "children": [
            {
              "element": "Link",
              "__children": "data.title",
              "attributes": {
                "==href": "data.slug + '/'"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

In this case we add `/` to each slug.

## Data sources

In the examples above, data coming from **data sources** has been connected, or bound, to the visible structure. Data sources are defined as below:

**dataSources/indexMarkdown.ts**

```typescript
import { parse } from "../utils/frontmatter.ts";
import { dir } from "../utils/fs.ts";
import type { BlogPost } from "../types.ts";

async function indexMarkdown(directory: string) {
  const blogFiles = await dir(directory, ".md");

  return Promise.all(
    blogFiles.map(({ path }) =>
      Deno.readTextFile(path).then((d) => parse(d) as BlogPost)
    ),
  );
}

export default indexMarkdown;
```

Data sources are asynchronous functions returning objects. Then, when bound, you
can access the content. This would be a good spot to connect to a database,
external API, or local data. In this particular example, we check the given
directory for Markdown files and then parse them.

Due to the signature, to implement a file loader you could do this:

```javascript
export default Deno.readTextFile;
```

## Transforms

Transforms accept data and then perform a manipulation on it. It could for example accept a Markdown string and convert it to HTML or reverse the input given to it as below:

**transforms/reverse.ts**

```typescript
function reverse(arr: unknown[]) {
  return [...arr].reverse();
}

export default reverse;
```

Both transforms and data sources are used in [the route definition](/routing/).

## Layouts

Gustwind layouts are comparable to components except they have specific fields for `head` and `body`:

**layouts/siteIndex.json**

```json
{
  "head": [
    {
      "element": "MetaFields"
    }
  ],
  "body": [
    {
      "element": "MainNavigation"
    },
    {
      "element": "header",
      "class": "bg-gradient-to-br from-purple-200 to-emerald-100 py-8",
      "children": [
        {
          "element": "div",
          "class": "sm:mx-auto px-4 py-4 sm:py-8 max-w-3xl flex",
          "children": [
            {
              "element": "div",
              "class": "flex flex-col gap-8",
              "children": [
                {
                  "element": "h1",
                  "class": "text-4xl md:text-8xl",
                  "children": [
                    {
                      "element": "span",
                      "class": "whitespace-nowrap pr-4",
                      "children": "🐳💨"
                    },
                    {
                      "element": "span",
                      "children": "Gustwind"
                    }
                  ]
                },
                {
                  "element": "h2",
                  "class": "text-xl md:text-4xl font-extralight",
                  "children": "Deno powered JSON oriented site generator"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "element": "div",
      "class": "md:mx-auto my-8 px-4 md:px-0 w-full lg:max-w-3xl prose lg:prose-xl",
      "__bind": "readme",
      "__children": "content"
    },
    {
      "element": "MainFooter"
    },
    {
      "element": "Scripts",
      "__bind": "scripts"
    }
  ]
}
```

For pages that are generated dynamically, i.e. blog pages, `match` is exposed.

**layouts/blogPage.json**

```json
{
  "head": [
    {
      "element": "MetaFields"
    }
  ],
  "body": [
    {
      "element": "MainNavigation"
    },
    {
      "element": "div",
      "class": "md:mx-auto my-8 px-4 md:px-0 w-full lg:max-w-3xl prose lg:prose-xl",
      "children": [
        {
          "element": "h1",
          "__children": "match.data.title"
        },
        {
          "element": "p",
          "inputProperty": "match.content",
          "transformWith": ["markdown"],
          "__children": "content"
        }
      ]
    },
    {
      "element": "MainFooter"
    },
    {
      "element": "Scripts",
      "__bind": "scripts"
    }
  ]
}
```
