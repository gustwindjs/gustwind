---
slug: 'concepts'
title: 'Concepts'
description: ''
---
You'll learn how different concepts of Gustwind go together on this page. It's self-similar in many ways and if you are familiar with technologies such as HTML, Tailwind, or React, likely you'll get used to it fast.

At its core, the page engine is an interpolating template interpreter that allows data binding. That means there's special syntax for connecting data with your pages and components. The data binding itself happens at [routing level](/routing/) and here we focus on the component and layout level.

## Components

To give you a simple example of a component, consider the following example for a link that is able to bold itself if it's matching to the path of the current page:

**components/Link.json**

[<file>](site/components/Link.json)


The styling semantics are based on [Tailwind](https://tailwindcss.com/) but you can see there's also data binding going on at `classList`.

A navigation component built on top of `Link` could look like this:

**components/Navigation.json**

[<file>](site/components/Navigation.json)


### Getters and interpolation

The following example illustrates the usage of getters (`__`) and interpolation (`==`):

**layouts/blogIndex.json**

[<file>](site/layouts/blogIndex.json)

In this case we add `/` to each slug.

## Data sources

In the examples above, data coming from **data sources** has been connected, or bound, to the visible structure. Data sources are defined as below:

**dataSources/indexMarkdown.ts**

[<file>](site/layouts/blogIndex.json)

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

[<file>](site/transforms/reverse.ts)

## Layouts

Gustwind layouts are comparable to components:

**layouts/siteIndex.json**

[<file>](site/layouts/siteIndex.json)

For pages that are generated dynamically, i.e. blog pages, `match` is exposed.

**layouts/blogPage.json**

[<file>](site/layouts/blogPage.json)

The same idea can be used to implement an RSS feed.

**layouts/rssPage.json**

[<file>](site/layouts/rssPage.json)

