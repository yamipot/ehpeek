import theme from "./theme.css";
import reader from "./reader.css";
import { registerGlobalStyle } from "./kit/helpers";

// Installed once per module/document, shared by Readers and standalone kit widgets.
// These resources must survive the unmount of any individual ReadingView.
registerGlobalStyle("ehpeek-reader-theme", theme);
registerGlobalStyle("ehpeek-reader-style", reader);

document.addEventListener("pointerover", (event) => {
  document.documentElement.dataset.readerPointer =
    event.pointerType === "mouse" ? "mouse" : "touch";
}, true);
