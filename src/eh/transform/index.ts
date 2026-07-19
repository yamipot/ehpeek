/**
 * Boundary between the original E-H document and EhPeek components.
 *
 * A feature function owns the complete source-DOM contract for one feature:
 * selectors, data extraction, required-node validation, ownership decisions,
 * and original class/style/attribute handling stay together in this package.
 * Components consume its result directly and must not query the original page.
 *
 * Source nodes are read only through `DomNode`. Validate every required node
 * before taking ownership and return `null` when the feature cannot be resolved.
 * `inplace`, `clone`, and `move` fix ownership immediately without applying
 * presentation changes; `move` also detaches the source node.
 *
 * Feature results separate detached values in `data` from owned nodes in
 * `elems`. Every `elems` property must be `ManagedDomNode`,
 * `ManagedDomNode[]`, or `null`; nested element-bearing objects and raw DOM
 * nodes are not allowed. Components embed these nodes through `Component` or
 * render into an owned anchor through `mount`, never through a raw-node getter.
 * EhPeek installation markers are created with `createAnchor` rather than by
 * treating a component's presentation class as installation state.
 *
 * Delayed DOM changes are exposed as small, named functions in `transforms`.
 * Each function changes one coherent part of the managed result, may be called
 * repeatedly, and accepts only the component-owned presentation inputs it uses.
 */
export * from "./core";
export * from "./galleryInfo";
export * from "./topBar";
