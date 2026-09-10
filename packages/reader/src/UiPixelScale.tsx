import { createContext, type Accessor, type JSX, untrack, useContext } from "solid-js";

const UiPixelScaleContext = createContext<Accessor<number>>(() => 1);

export function UiPixelScaleProvider(props: {
  children: JSX.Element;
  value: Accessor<number>;
}) {
  const value = untrack(() => props.value);
  return (
    <UiPixelScaleContext.Provider value={value}>
      {props.children}
    </UiPixelScaleContext.Provider>
  );
}

export function useUiPixelScale(): Accessor<number> {
  return useContext(UiPixelScaleContext);
}
