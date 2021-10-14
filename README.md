Gustwind is an experimental site generator built on top of JSON definitions using [Deno](https://deno.land/), [Twind](https://twind.dev/), and [Sidewind](https://sidewind.js.org/). The goal of the design is to allow component oriented development of large scale sites (more than thousands of pages). Conceptually it's split as follows:

* **Development mode** lets you preview the site and modify page definitions to commit later
* **Production mode** generates pure static HTML with CSS inlined to the files
* **Components** defined with a JSON based component abstraction included allow you to extract shared markup and bind data to it
* **Data sources** define how your data is fetched. At page level, it can then be connected and bound to components
* **Transforms** let you alter data to fit the current need. You can use them for example convert Markdown input to HTML or reverse the order of an array to generate a blog index in a specific order.
* **Pages** based on the JSON page definitions describe the site and use the concepts above to compose your site

Please see the documentation to learn more about the concepts.

## Further development to be done

* Parallelize build process for extra performance (likely needs import maps for Web Workers in Deno)
* Mark components without data dependencies as pure to allow memoization for faster compilation
* Set up a [JSON schema](http://json-schema.org/) to define components and pages to allow validation
* Add a component explorer to allow defining components through the development mode
* Implement an incremental compiler to detect changes and compile only what has changed instead of compiling the whole site
* Allow composition of transforms (i.e. array syntax)

## Notes

The project needs Deno 1.15.1 or newer to run! I recommend using a tool like [dvm](https://github.com/justjavac/dvm) for managing the version.

## Earlier related work

* [Tailspin](https://github.com/survivejs/tailspin) was an experimental site generator built with partially the same technology. In this project, the ideas have been largely re-implemented and taken further. In some ways Tailspin went further, though, as it implemented component level introspection (types) and editors while allowing JSX syntax.
* [Antwar](https://antwar.js.org/) was a React based static site generator. The experiences with Antwar over years have been put to good use in this project.

## Usage

Run the available commands through [velociraptor](https://github.com/umbopepato/velociraptor) (vr).
