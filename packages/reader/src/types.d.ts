declare module "*.css" {
  const css: string;
  export default css;
}
declare module "reader:ui-sizes" {
  type Sizes = import("./kit/ui").UiSizeScale;
  const sizes: {
    control: Sizes;
    font: Sizes;
    icon: Sizes;
    space: Sizes;
    radius: Sizes;
  };
  export default sizes;
}
