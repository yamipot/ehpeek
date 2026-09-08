import { createContext, useContext, untrack, type JSX } from "solid-js";
import en from "../../locales/en.json";
import ja from "../../locales/ja.json";
import zhCN from "../../locales/zh-CN.json";

export type ReaderTexts = typeof en;
export const readerLocales = { en, ja, "zh-CN": zhCN };
const ReaderTextsContext = createContext<ReaderTexts>(en);
export function ReaderTextsProvider(props: {
  texts: ReaderTexts;
  children: JSX.Element;
}) {
  const texts = untrack(() => props.texts);
  return (
    <ReaderTextsContext.Provider value={texts}>
      {props.children}
    </ReaderTextsContext.Provider>
  );
}
export function useReaderTexts(): ReaderTexts {
  return useContext(ReaderTextsContext);
}
