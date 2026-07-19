# EhPeek rules

## Coding
- Fix lint findings instead of suppressing rules; run `pnpm lint`, `pnpm check`, and `pnpm build` after source changes.
- Comments should explain a boundary, external constraint, or non-obvious reason instead of repeating the code.

## Logic
- Keep changes scoped to the request; do not add compatibility fallbacks or unrelated refactors.
- Follow the original-page DOM and component ownership boundary documented in `src/eh/dom/index.ts`.
- Keep original E-H selectors, markup assumptions, and original-node transformations inside `src/eh/dom`; components only consume detached data and managed nodes.
- Write component structure as coherent TSX; refs may access component-owned DOM but should not expose raw nodes when a semantic operation is sufficient.
- Prefer `state` for persistent observable values and continuous interaction data; keep it with the closest owner that coordinates all consumers.
- Use non-null `actions` only at imperative side-effect boundaries such as focus, scrolling, downloads, or lifecycle control where encoding a transient command as state would require consume/reset semantics; use `callbacks` for user events, results, or requests flowing back to the owner, without pass-through wrappers or conversion layers.
- Prefer UnoCSS utilities; use separate imported CSS only when Uno cannot express the behavior clearly, and never generate CSS from inline string templates.
- Reuse the standard sizing classes in `uno.config.mjs` (`xs` through `xl`) for controls, spacing, corners, and text before using arbitrary values. Reuse semantic colors from `src/theme.css` and existing `ehp-color-*` shortcuts; avoid hardcoded colors and one-off color shortcuts.
- Use `coarse:` for input-capability responsive sizing
