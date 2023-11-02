---
slug: 'concepts'
title: 'Concepts'
description: ''
---
You'll learn how different concepts of Gustwind go together on this page. It's self-similar in many ways and if you are familiar with technologies such as HTML, Tailwind, or React, likely you'll get used to it fast.

At its core, the page engine is an interpolating template interpreter that allows data binding. That means there's special syntax for connecting data with your pages and components. The data binding itself happens at [routing level](/routing/) and here we focus on the component and layout level.

## Components

To give you a simple example of a component, consider the following example for a link that is able to bold itself if it's matching to the path of the current page:

**components/SiteLink.html**

[<file>](site/components/SiteLink.html)


The styling semantics are based on [Tailwind](https://tailwindcss.com/) but you can see there's also data binding going on at `classList`.

A navigation component built on top of `SiteLink` could look like this:

**components/Navigation.html**

[<file>](site/components/Navigation.html)


### Utilities

The following example illustrates the usage of utilities:

**layouts/blogIndex.html**

[<file>](site/layouts/blogIndex.html)

## Data sources

In the examples above, data coming from **data sources** has been connected, or bound, to the visible structure. Data sources are defined as below:

**dataSources.ts**

[<file>](site/dataSources.ts)

Data sources are asynchronous functions returning arrays of objects. Then, when bound, you
can access the content. This would be a good spot to connect to a database,
external API, or local data.

## Layouts

Gustwind layouts are technically components:

**layouts/siteIndex.html**

[<file>](site/layouts/siteIndex.html)

For pages that are generated dynamically, i.e. blog pages, `match` is exposed.

The same idea can be used to implement an RSS feed.

**layouts/rssPage.html**

[<file>](site/layouts/rssPage.html)
