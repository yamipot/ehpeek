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

const storedLocale = GM_getValue<unknown>(
  APP_LOCALE_SETTING_KEY,
  DEFAULT_APP_LOCALE,
);
export const appLocale: AppLocale = APP_LOCALES.includes(storedLocale as AppLocale)
  ? storedLocale as AppLocale
  : DEFAULT_APP_LOCALE;

export default localeTexts[appLocale];
