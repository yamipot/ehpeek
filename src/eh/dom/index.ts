/**
 * Boundary between the original E-H document and EhPeek components.
 *
 * A feature function owns the complete source-DOM contract for one feature:
 * selectors, data extraction, required-node validation, ownership decisions,
 * and original class/style/attribute handling stay together in this package.
 * Components consume its `XxxDom` object directly and must not query the
 * original page.
 *
 * Source nodes are read only through `DomNode`. Validate every required node
 * before taking ownership and return `null` when the feature cannot be resolved.
 * `inplace`, `clone`, and `move` fix ownership immediately without applying
 * presentation changes; `move` also detaches the source node.
 * Use `DomNode.observe` for asynchronously inserted source nodes and choose
 * ownership in its acquire callback; use `ManagedDomNode.observe` after ownership.
 *
 * Extracted `XxxDom` objects separate detached values in `data` from owned
 * nodes in `elems`. Every `elems` property must be `ManagedDomNode`,
 * `ManagedDomNode[]`, or `null`; nested element-bearing objects and raw DOM
 * nodes are not allowed. Components embed these nodes through `Component` or
 * render into an owned anchor through `mount`, never through a raw-node getter.
 * EhPeek installation markers are created with `createAnchor` rather than by
 * treating a component's presentation class as installation state.
 *
 * Delayed DOM changes are exposed as small, named functions in `transforms`.
 * Each function changes one coherent part of the managed result, may be called
 * repeatedly, and accepts only the component-owned presentation inputs it uses.
 * Persistent observable values belong in component state. A feature may expose
 * non-null `actions` only for imperative effects on its managed nodes.
 * An action may accept a component-owned ref as a semantic mount or mirror
 * target, but it must never return a raw original-page node.
 * Keep one-off resolve/apply helpers inside their feature function; only parsers
 * shared by multiple features or repeated document loads belong at module scope.
 * Public feature entry points use `extractXxx` names and are called together by
 * App page injection. Async providers may extract fetched documents; later DOM
 * refreshes stay behind the source's actions or transforms.
 */
export * from "./core";
export * as EhSyringe from "./ehSyringe";
export * from "./galleryInfo";
export * from "./gallery";
export * from "./search";
export * from "./searchPanel";
export * from "./singlePage";
export * from "./topBar";
