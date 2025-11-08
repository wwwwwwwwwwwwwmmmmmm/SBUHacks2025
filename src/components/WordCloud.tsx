// Client-side word cloud wrapper using @isoterik/react-word-cloud
"use client";

import React from "react";
import {WordCloud as WordCloudLib} from "@isoterik/react-word-cloud";

type WordCounts = Record<string, number>;

export default function WordCloud({
                                      title,
                                      wordCounts,
                                      width = 600,
                                      height = 300,
                                      fill,
                                  }: {
    title: string;
    wordCounts: WordCounts;
    width?: number | string;
    height?: number | string;
    fill?: string;
}) {
    const entries = Object.entries(wordCounts).map(([text, value]) => ({
        text,
        value,
    }));

    const widthNumber = typeof width === "number" ? width : 600;
    const heightNumber = typeof height === "number" ? height : 300;

    // Compute min/max so we can scale font sizes smoothly
    const values = entries.map((e) => e.value);
    const maxVal = values.length ? Math.max(...values) : 0;
    const minVal = values.length ? Math.min(...values) : 0;

    function fontSizeForValue(value: number) {
        const minSize = 14;
        const maxSize = 64;
        if (maxVal === minVal) return Math.round((minSize + maxSize) / 2);
        const t = (value - minVal) / (maxVal - minVal);
        return Math.round(minSize + t * (maxSize - minSize));
    }

    return (
        <div style={{padding: 12}}>
            {/* show a small visually-hidden title for accessibility if provided */}
            {title ? <h3 style={{marginBottom: 8}}>{title}</h3> : null}
            {entries.length === 0 ? (
                <div style={{color: "#666"}}>No feedback found.</div>
            ) : (
                <div style={{width: typeof width === "number" ? widthNumber : "100%", height: heightNumber}}>
                    {/* @isoterik/react-word-cloud renders a responsive SVG/canvas */}
                    <WordCloudLib
                        words={entries}
                        width={widthNumber}
                        height={heightNumber}
                        padding={2}
                        fontSize={(w) => fontSizeForValue(w.value)}
                        // subtle rotation for visual interest
                        rotate={(_, i) => (i % 6 === 0 ? -45 : i % 2 === 0 ? 0 : -15)}
                        // apply fill color if provided
                        fill={fill}
                    />
                </div>
            )}
        </div>
    );
}
