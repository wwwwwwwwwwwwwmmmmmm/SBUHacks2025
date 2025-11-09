"use client";

import React from "react";
import {useTheme} from "../utils/theme";

export default function ThemeToggle() {
    const [theme, , toggle] = useTheme();

    return (
        <button
            onClick={toggle}
            aria-label="Toggle theme"
            title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            className="btn-toggle"
        >
            {theme === "dark" ? "🌙" : "☀️"}
        </button>
    );
}
