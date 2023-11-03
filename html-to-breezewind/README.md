# html-to-breezewind

This module converts standard HTML to a Breezewind structure. To support Breezewind features, the following HTML extensions have been implemented:

* `_` attribute bindings. I.e., `_class="{ 'utility': 'get', 'parameters': ['props', 'class'] }"` would derive `class` based on a prop named `class`. The same feature works for `_children`.
* `_classList` shortcut allows evaluating multiple clauses per class and it maps to `classList` feature of Breezewind.
* `#` allows evaluating logic at a specific callsite. This is useful if you want to derive the value of a prop before passing it further. The same feature works for `#children`, not only attributes.
* `&` is an expression shortcut. I.e., `&href="(get props href)"` would map to `href="{ 'utility': 'get', 'parameters': ['props', 'href'] }"`. The shortcut works also for `&children`, `&foreach`, and `&type` for `noop`.
* `noop` - Comparable to React fragments (i.e., is able to lose itself and operate as a temporary structure for grouping)
* `noop` with `_type` attribute to allow binding element dynamically from context
* `_visibleIf` attribute accepts an array of clauses. Should all evaluate as true, the element in question will be remain in the structure.

In addition, the converter handles required mapping for components (any type starting with uppercase) and hides handling of props. Eventually props might be merged with attributes in Breezewind as there is a significant overlap between the concepts.

To understand the features in detail, see the tests.

## License

MIT.
