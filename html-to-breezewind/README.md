# html-to-breezewind

This module converts standard HTML to a Breezewind structure. To support Breezewind features, the following HTML extensions have been implemented:

* `&` is an expression shortcut. I.e., `&href="(get props href)"` would map to `href="{ 'utility': 'get', 'parameters': ['props', 'href'] }"`. The shortcut works also for `&children`, `&foreach`, `$visibleIf`, `&class`, `&class[0]`, and `&type` for `noop`.
* `noop` - Comparable to React fragments (i.e., is able to lose itself and operate as a temporary structure for grouping)

In addition, the converter handles required mapping for components (any type starting with uppercase) and hides handling of props. Eventually props might be merged with attributes in Breezewind as there is a significant overlap between the concepts.

To understand the features in detail, see the tests.

## License

MIT.
