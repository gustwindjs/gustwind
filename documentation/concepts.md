# Concepts

You'll learn how different concepts of Gustwind go together on this page. It's self-similar in many ways and if you are familiar with technologies such as HTML, Tailwind, or React, likely you'll get used to it fast.

At its core, the page engine is an interpolating template interpreter that allows data binding. That means there's special syntax for connecting data with your pages and components.

## Components

To give you a simple example of a component, consider the following example for a link that is able to bold itself if it's matching to the path of the current page:

**components/link.json**

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

**components/navigation.json**


```json
[
  {
    "component": "link",
    "children": "Blog",
    "attributes": {
      "href": "/blog/"
    }
  },
  {
    "component": "link",
    "children": "About",
    "attributes": {
      "href": "/about/"
    }
  }
]
```

To build a subscription widget, you would do something along this:

**components/subscribe.json**

```json
{
  "element": "button",
  "children": "Subscribe to the mailing list",
  "attributes": {
    "onclick": "subscribe()"
  }
}
```

The same idea of binding works for `children`. You can bind to the children of an element using `__children`. I.e. `"__children": "link"` would bind the value of the `link` property to `children`. Consider the example below:

**components/libraries.json**

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
          "component": "link",
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
  "component": "allLibraries",
  "__bind": "libraries"
}
```

In addition to binding data from a source, you can do static bindings to pass data to components:

```json
{
  "component": "githubCorner",
  "__bind": {
    "url": "https://github.com/survivejs/gustwind"
  }
}
```

## Data sources

In the examples above, data coming from **data sources** has been connected, or bound, to the visible structure. Data sources are defined as below:

**dataSources/readme.ts**

```javascript
function getReadme() {
  return Deno.readTextFile("./README.md");
}

export default getReadme;
```

Data sources are asynchronous functions returning objects. Then, when bound, you can access the content. This would be a good spot to connect to a database, external API, or local data. For this particular project, we only map the readme file to the site to be able to show it at the index.

## Pages

Gustwind follows a couple of conventions for page definitions. The rules are as follows:

* `pages/index.json` - `/` of the site
* `pages/about.json` - `/about/` of the site
* `pages/[blog].json` - `/blog/some-title` of the site

The first two cases can be defined with the following syntax:

**pages/index.json**

```json
{
  "meta": {
    "title": "Gustwind",
    "description": ""
  },
  "dataSources": [
    {
      "name": "readme",
      "transformWith": "markdown"
    }
  ],
  "page": [
    {
      "element": "main",
      "class": "py-4 mx-auto max-w-3xl prose lg:prose-xl",
      "__bind": "readme",
      "__children": "content"
    }
  ]
}
```

Note the `meta`, `dataSources`, and `page` portions of the configuration:

* `meta` is used to define the metadata per page show in `meta` tags and `title`
* `dataSources` define **which** data to map to the page and how to optionally **transform** them
* `page` is about the page content and **how** the data is bound. This is the spot where it's good to leverage the power of components and connect data with them.

For the about page, you would do something similar and perhaps bind to another Markdown file somewhere in the system.

The `[blog].json` case is more complicated as there we'll have to define the mapping between the entry data (blog pages) and pages to be generated. That's handled as follows:

**pages/[blog].json**

```json
{
  "meta": {
    "__title": "match.name",
    "__description": "match.description"
  },
  "matchBy": { "dataSource": "blogPosts", "field": "id" },
  "dataSources": [{ "name": "blogPosts" }],
  "page": [
    {
      "component": "mainNavigation"
    },
    {
      "element": "main",
      "class": "py-4 mx-auto max-w-3xl prose lg:prose-xl",
      "children": [
        {
          "component": "h1",
          "__children": "match.title"
        },
        {
          "element": "p",
          "transformWith": "markdown",
          "selectProperty": "content",
          "__children": "match.body"
        }
      ]
    },
    {
      "component": "mainFooter"
    }
  ]
}
```

In this example, we're defining the mapping between the data and the pages to generate using the `matchBy` field. There we tell the system that you should generate a page per each of the `blogPosts` based on their `id` which will happen to be the slug as well (this might change later to be more configurable).

Another thing we're doing here is binding data to the `meta` of the page. That `match` property contains the data of the currently matched blog post and we can use it where we need it.

## Transforms

Note also the `transformWith` property we use against the match body. Using it we tell the system to use the `markdown` transform to compile.

We can apply the same idea for generating a reversed blog index:

**pages/blog.json**

```json
{
  "meta": {
    "title": "Blog",
    "description": "Blog description goes here"
  },
  "dataSources": [{ "name": "blogPosts", "transformWith": "reversed" }],
  "page": [
    {
      "component": "mainNavigation"
    },
    {
      "element": "main",
      "class": "py-4 mx-auto max-w-5xl prose lg:prose-xl",
      "children": [
        {
          "component": "h1",
          "children": "Blog"
        },
        {
          "component": "blogPosts",
          "__bind": "blogPosts"
        }
      ]
    },
    {
      "component": "mainFooter"
    }
  ]
}
```

Transforms are powerful as they let you shape the data to fit specific needs within different parts of the system.
