"use client";

import React, {Ref, useCallback} from "react";
import {
    AnimatedWordRenderer,
    defaultFill,
    FinalWordData,
    WordCloud as WordCloudLib,
    WordMouseEvent,
    WordRendererData,
} from "@isoterik/react-word-cloud";

type WordCounts = Record<string, number>;

export default function WordCloud({
                                      title,
                                      wordCounts,
                                      width = 600,
                                      height = 300,
                                      fill,
                                      onWordClickAction,
                                      scaleDuration = 200,
                                      scaleSize = 1.4,
                                      wordType = 0,
                                  }: {
    title: string;
    wordCounts: WordCounts;
    width?: number | string;
    height?: number | string;
    fill?: string;
    onWordClickAction?: (word: string) => void;
    scaleDuration?: number; // in ms
    scaleSize?: number;
    wordType?: number;
}) {
    const entries = Object.entries(wordCounts).map(([text, value]) => ({
        text,
        value,
    }));

    const widthNumber = typeof width === "number" ? width : 600;
    const heightNumber = typeof height === "number" ? height : 300;

    const maxVal = entries.length ? Math.max(...entries.map((e) => e.value)) : 0;
    const minVal = entries.length ? Math.min(...entries.map((e) => e.value)) : 0;

    const fontSizeForValue = useCallback(
        (value: number) => {
            const minSize = 14;
            const maxSize = 64;
            if (maxVal === minVal) return Math.round((minSize + maxSize) / 2);
            const t = (value - minVal) / (maxVal - minVal);
            return Math.round(minSize + t * (maxSize - minSize));
        },
        [minVal, maxVal]
    );

    const handleWordClick = useCallback(
        (w: FinalWordData) => {
            if (onWordClickAction) onWordClickAction(w.text);
        },
        [onWordClickAction]
    );

    const handleWordMouseOver = useCallback(
        (_word: FinalWordData, _index: number, event: WordMouseEvent) => {
            const element = event.currentTarget as SVGTextElement;

            // Store original transform and transition if not stored
            if (!element.dataset.originalTransform) {
                element.dataset.originalTransform = element.getAttribute("transform") || "";
            }
            if (!element.dataset.originalTransition) {
                element.dataset.originalTransition = (element.style && element.style.transition) || "";
            }

            // Smooth scale
            element.style.transition = `all ${scaleDuration}ms ease`;
            const transformWithoutScale = element.dataset.originalTransform.replace(/\s*scale\([^)]*\)/g, "");
            element.setAttribute("transform", `${transformWithoutScale} scale(${scaleSize})`);

            // Bring to front
            setTimeout(() => {
                if (element.parentNode) element.parentNode.appendChild(element);
            }, scaleDuration);

            // Drop shadow
            element.style.filter = `drop-shadow(2px 4px 6px rgba(0,0,0,0.15))`;

            // Hover colors (theme-aware via CSS variables)
            const positiveHover = 'var(--positive-hover)'; // CSS variable defined in globals.css
            const negativeHover = 'var(--negative-hover)';
            const neutralHover = 'var(--positive)'; // fallback to positive tint

            element.style.cursor = 'pointer';
            element.style.fill = wordType > 0 ? positiveHover : wordType < 0 ? negativeHover : neutralHover;
        },
        [scaleDuration, scaleSize, wordType]
    );

    const handleWordMouseOut = useCallback(
        (_word: FinalWordData, _index: number, event: WordMouseEvent) => {
            const element = event.currentTarget as SVGTextElement;

            const originalTransform = element.dataset.originalTransform || "";
            element.setAttribute("transform", originalTransform);

            element.style.transition = element.dataset.originalTransition || "";

            element.style.filter = "";
            element.style.cursor = "";
            // Use the fill from the word if present, otherwise fall back to defaultFill (string)
            element.style.fill = _word.fill ?? (defaultFill as string);
        },
        []
    );

    const resolveFontSize = useCallback(
        (word: { value: number }) => fontSizeForValue(word.value),
        [fontSizeForValue]
    );

    const resolveWordRenderer = useCallback(
        (data: WordRendererData, ref: Ref<SVGTextElement> | undefined) => (
            <AnimatedWordRenderer data={data} ref={ref}/>
        ),
        []
    );

    return (
        <div className="wc-container">
            {title && <h3 className="wc-title">{title}</h3>}
            {entries.length === 0 ? (
                <div className="text-muted">No words to display.</div>
            ) : (
                <WordCloudLib
                    words={entries}
                    width={widthNumber}
                    height={heightNumber}
                    padding={2}
                    fontSize={resolveFontSize}
                    rotate={(_, i) => (i % 6 === 0 ? -45 : i % 3 === 0 ? 0 : -15)}
                    fill={fill ?? defaultFill}
                    renderWord={resolveWordRenderer}
                    onWordClick={handleWordClick}
                    onWordMouseOver={handleWordMouseOver}
                    onWordMouseOut={handleWordMouseOut}
                />
            )}
        </div>
    );
}
