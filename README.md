# 🐳💨 – Gustwind – Deno powered JSON oriented site generator

Gustwind is an experimental site generator built on top of JSON definitions using [Deno](https://deno.land/), [Twind](https://twind.dev/), and [Sidewind](https://sidewind.js.org/). The goal of the design is to allow component oriented development of large scale sites (more than thousands of pages). Conceptually it's split as follows:

* **Development mode** lets you preview the site and modify page definitions to commit later
* **Production mode** generates pure static HTML with CSS inlined to the files
* **Components** defined with a JSON based component abstraction included allow you to extract shared markup and bind data to it
* **Data sources** define how your data is fetched. At page level, it can then be connected and bound to components
* **Transforms** let you alter data to fit the current need. You can use them for example convert Markdown input to HTML or reverse the order of an array to generate a blog index in a specific order.
* **Pages** based on the JSON page definitions describe the site and use the concepts above to compose your site

I've explained the concepts in greater detail below.

## Development mode

The development mode of this project is available through `vr start`. After running, you should head to `localhost:3000` in the browser. It's connected to detect changes to the server file (`src/serve.ts`) and to JSON files of the project. It then communicates the changes through a web socket to the frontend that's then able to update its state to match the current.

There's a simple JSON editor included to the development mode available through the "Show editor" button at the bottom right corner of the window. The current implementation is based on [josdejong/jsoneditor](https://github.com/josdejong/jsoneditor) and it communicates any changes made to the JSON structure to the backend that then writes them to the file system.

Due to the change, the server logic mentioned earlier will trigger and the frontend will update automatically. The idea is comparable to Hot Module Replacement (HMR) although on a more naïve level as the current implementation isn't as granular as it could be (it replaces all content no matter what).

## Production mode

In the production mode (`vr build`), the tool generates HTML at the `./build` directory. During tests against a large site with over 2000 pages, the build was completed in a few seconds and so far the performance seems promising although it can be still improved and not a lot of thought has been given to it.

## Components

To give you a simple example of a component, consider the following example for a link component:

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

## Data sources

In the examples above, data coming from **data sources** has been connected, or bound, to the visible structure. Data sources are defined as below:

**dataSources/readme.ts**

```typescript
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

## Further development to be done

* Parallelize build process for extra performance (likely needs import maps for Web Workers in Deno)
* Mark components without data dependencies as pure to allow memoization for faster compilation
* Set up a [JSON schema](http://json-schema.org/) to define components and pages to allow validation
* Add a component explorer to allow defining components through the development mode
* Implement an incremental compiler to detect changes and compile only what has changed instead of compiling the whole site
* Allow composition of transforms (i.e. array syntax)

## Earlier related work

* [Tailspin](https://github.com/survivejs/tailspin) - Tailspin was an experimental site generator built with partially the same technology. In this project, the ideas have been largely re-implemented and taken further.
* [Antwar](https://antwar.js.org/) was a React based static site generator. The experiences with Antwar over years have been put to good use in this project.

## Usage

Run the available commands through [velociraptor](https://github.com/umbopepato/velociraptor) (vr).
