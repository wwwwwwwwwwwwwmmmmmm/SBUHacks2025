"use client";

import React from "react";
import {useTheme} from "@/utils/theme";

export default function ThemeToggle() {
    const [theme, , toggle] = useTheme();

    return (
        <button
            onClick={toggle}
            aria-label="Toggle theme"
            aria-pressed={theme === "dark"}
            title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            className="btn-toggle nav-link"
        >
            {theme === "dark" ? "🌙" : "☀️"}
        </button>
    );
}
