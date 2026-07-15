# Rules

### E-H page
- All E-H page-specific DOM selectors, original-node class/style handling, and markup assumptions must stay in `src/eh/dom.ts`; components should call runtime helpers as `eh.xxx`, not named imports.

### Components
- Component CSS should live in separate `.css` files and be imported; do not build CSS with inline string templates.
- Component DOM trees should be written as a TSX adaptor near the top of the file. 
- Prefer one visible TSX tree per component, but extract small local DOM operators for repeated structures or repeated class/attribute patterns. For fixed component structure, write the visible hierarchy as one coherent TSX tree instead of creating many sibling nodes and assembling them.
- Use refs inside the adaptor only to capture nodes needed by semantic operations. The factory should return semantic DOM operations instead of exposing raw element refs whenever practical.
- Components should not directly call or construct other components; compose them from an owner/root module instead.
