"use client";

import {useEffect} from "react";

// Small client-side component that synchronizes the actual navbar size with CSS variables
// so pages can reliably compute heights like `calc(100vh - var(--app-navbar-height) - var(--app-navbar-margin-bottom))`.
export default function NavbarSizeSync() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const root = document.documentElement;
        const selector = ".app-navbar";

        function updateVars() {
            const nav = document.querySelector(selector) as HTMLElement | null;
            if (!nav) return;
            const rect = nav.getBoundingClientRect();
            const cs = getComputedStyle(nav);
            const marginBottom = parseFloat(cs.marginBottom) || 0;
            const height = rect.height || nav.offsetHeight || 0;
            root.style.setProperty("--app-navbar-height", `${height}px`);
            root.style.setProperty("--app-navbar-margin-bottom", `${marginBottom}px`);
        }

        // Update now
        updateVars();

        // Update on resize and orientation change
        window.addEventListener("resize", updateVars);
        window.addEventListener("orientationchange", updateVars);

        // Observe the navbar for size/style changes (class toggles, content changes)
        const navEl = document.querySelector(selector);
        let ro: ResizeObserver | null = null;
        let mo: MutationObserver | null = null;

        if (typeof ResizeObserver !== "undefined" && navEl instanceof Element) {
            ro = new ResizeObserver(updateVars);
            ro.observe(navEl);
        }

        if (typeof MutationObserver !== "undefined" && navEl instanceof Element) {
            mo = new MutationObserver(updateVars);
            mo.observe(navEl, {attributes: true, childList: true, subtree: true});
        }

        return () => {
            window.removeEventListener("resize", updateVars);
            window.removeEventListener("orientationchange", updateVars);
            if (ro) ro.disconnect();
            if (mo) mo.disconnect();
        };
    }, []);

    return null;
}

