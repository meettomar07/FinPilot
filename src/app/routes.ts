import type { Page } from "./screens";

const PAGE_HASHES: Record<Page, string> = {
  landing: "#/",
  onboarding: "#/onboarding",
  dashboard: "#/dashboard",
  goals: "#/goals",
  transactions: "#/transactions",
  forecast: "#/forecast",
  "decision-lab": "#/decision-lab",
  "ai-assistant": "#/ai-assistant",
  privacy: "#/privacy",
  settings: "#/settings",
};

const HASH_PAGES = Object.entries(PAGE_HASHES).reduce<Record<string, Page>>((acc, [page, hash]) => {
  acc[hash] = page as Page;
  return acc;
}, {});

export function getRouteForPage(page: Page) {
  return PAGE_HASHES[page];
}

export function getPageFromHash(hash: string): Page {
  return HASH_PAGES[hash] ?? "landing";
}

export function normalizeHash(hash: string) {
  if (!hash || hash === "#") {
    return PAGE_HASHES.landing;
  }

  return hash.startsWith("#/") ? hash : `#${hash.replace(/^#?/, "/")}`;
}
