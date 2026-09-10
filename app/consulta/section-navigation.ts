import type { MouseEvent } from "react";

/** Keep same-page anchors out of the router's popstate/scroll restoration. */
export function navigateToSection(event: MouseEvent<HTMLElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;

  const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || !event.currentTarget.contains(anchor) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

  const currentUrl = new URL(window.location.href);
  const targetUrl = new URL(anchor.href, currentUrl);
  if (!targetUrl.hash || targetUrl.origin !== currentUrl.origin || targetUrl.pathname !== currentUrl.pathname) return;
  if (targetUrl.search && targetUrl.search !== currentUrl.search) return;

  let id: string;
  try {
    id = decodeURIComponent(targetUrl.hash.slice(1));
  } catch {
    return;
  }
  const section = document.getElementById(id);
  if (!section) return;

  event.preventDefault();
  // Preserve attribution parameters and router state without a native hash navigation.
  if (currentUrl.hash !== targetUrl.hash) {
    currentUrl.hash = targetUrl.hash;
    window.history.pushState(window.history.state, "", currentUrl);
  }

  // Move keyboard focus without starting a second scroll animation.
  const temporaryTabIndex = !section.hasAttribute("tabindex");
  if (temporaryTabIndex) section.setAttribute("tabindex", "-1");
  section.focus({ preventScroll: true });
  if (temporaryTabIndex) section.removeAttribute("tabindex");

  const instant = window.matchMedia("(prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)").matches;
  const offset = Number.parseFloat(window.getComputedStyle(section).scrollMarginTop) || 0;
  window.scrollTo({
    top: Math.max(0, window.scrollY + section.getBoundingClientRect().top - offset),
    behavior: instant ? "instant" : "smooth",
  });
}
