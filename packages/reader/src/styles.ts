import theme from "./theme.css";
import reader from "./reader.css";
import { registerGlobalStyle } from "./kit/helpers";
registerGlobalStyle("ehpeek-reader-theme", theme);
registerGlobalStyle("ehpeek-reader-style", reader);

document.addEventListener("pointerover", (event) => {
  document.documentElement.dataset.readerPointer =
    event.pointerType === "mouse" ? "mouse" : "touch";
}, true);
