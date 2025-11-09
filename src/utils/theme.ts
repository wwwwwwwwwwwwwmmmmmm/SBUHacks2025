import {useCallback, useEffect, useState} from "react";

export type Theme = "light" | "dark";

function isBrowser(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function setTheme(theme: Theme) {
    if (!isBrowser()) return;
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    try {
        localStorage.setItem("theme", theme);
    } catch {
        // ignore quota / permission errors
    }
}

export function getTheme(): Theme {
    if (!isBrowser()) return "light";
    try {
        const t = localStorage.getItem("theme");
        if (t === "light" || t === "dark") return t;
    } catch {
        // ignore
    }
    return "light";
}

// React hook for client components
export function useTheme(): [Theme, (t: React.SetStateAction<Theme>) => void, () => void] {
    const [theme, setThemeState] = useState<Theme>(() => getTheme());

    useEffect(() => {
        setTheme(theme);
    }, [theme]);

    // setter accepts either a Theme or an updater function like React's setState
    const set = useCallback((t: React.SetStateAction<Theme>) => {
        setThemeState((prev) => {
            const next = typeof t === "function" ? (t as (prev: Theme) => Theme)(prev) : t;
            setTheme(next as Theme);
            return next as Theme;
        });
    }, []);

    const toggle = useCallback(() => {
        set((prev) => (prev === "light" ? "dark" : "light"));
    }, [set]);

    return [theme, set, toggle];
}
