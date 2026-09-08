import texts from "../locales/en.json";
import ja from "../locales/ja.json";
import zhCn from "../locales/zh-CN.json";

export const APP_LOCALES = ["en", "zh-CN", "ja"] as const;
export type AppLocale = typeof APP_LOCALES[number];

export const APP_LOCALE_OPTIONS: ReadonlyArray<{
  label: string;
  value: AppLocale;
}> = [
  { label: "English", value: "en" },
  { label: "简体中文", value: "zh-CN" },
  { label: "日本語", value: "ja" },
];

export const APP_LOCALE_SETTING_KEY = "ehpeek:language";
export const DEFAULT_APP_LOCALE: AppLocale = "en";

const localeTexts = {
  en: texts,
  "zh-CN": zhCn,
  ja,
} satisfies Record<AppLocale, typeof texts>;

export let appLocale: AppLocale = DEFAULT_APP_LOCALE;
let activeTexts = localeTexts[appLocale];

export function setAppLocale(locale: AppLocale): void {
  appLocale = locale;
  activeTexts = localeTexts[locale];
}

export { activeTexts as default };
