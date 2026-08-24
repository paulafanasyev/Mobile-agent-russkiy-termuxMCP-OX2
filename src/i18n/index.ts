import { en } from "./en";
import { ru } from "./ru";
import { vi } from "./vi";

export type Locale = "ru" | "vi" | "en";
/** All translation keys are derived from the canonical Russian dictionary. */
export type TKey = keyof typeof ru;

const DICTS: Record<Locale, Record<TKey, string>> = { ru, vi, en };

// Russian is the default so existing release-smoke markers remain unchanged.
let current: Locale = "ru";
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  current = locale;
  listeners.forEach((listener) => listener(locale));
}

export function subscribeLocale(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current locale -> Russian fallback -> key; never returns undefined. */
export function t(key: TKey): string {
  return DICTS[current][key] ?? DICTS.ru[key] ?? key;
}
