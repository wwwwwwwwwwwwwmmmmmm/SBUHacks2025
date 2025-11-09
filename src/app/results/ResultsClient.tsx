"use client";

import React, {useMemo, useState} from "react";
import WordCloud from "../../components/WordCloud";

type Analysis = {
    id: number;
    transcript_id: number | null;
    summary: string | null;
    positive_feedback: string[] | null;
    negative_feedback: string[] | null;
    created_at: string | null;
};

export default function ResultsClient({
                                          rows,
                                          topPos,
                                          topNeg,
                                          totalPosPhrases,
                                          totalNegPhrases,
                                      }: {
    rows: Analysis[];
    topPos: Record<string, number>;
    topNeg: Record<string, number>;
    totalPosPhrases: number;
    totalNegPhrases: number;
}) {
    const [selected, setSelected] = useState<{ word: string; polarity: "positive" | "negative" } | null>(null);
    const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

    const matchingAnalyses = useMemo(() => {
        if (!selected) return [];
        const w = selected.word.toLowerCase();
        const pol = selected.polarity;
        return rows.filter((r) => {
            const arr = pol === "positive" ? r.positive_feedback ?? [] : r.negative_feedback ?? [];
            return arr.some((p) => p.toLowerCase().includes(w));
        });
    }, [selected, rows]);

    function toggleWord(word: string, polarity: "positive" | "negative") {
        if (selected && selected.word === word && selected.polarity === polarity) {
            setSelected(null);
        } else {
            setSelected({word, polarity});
        }
    }

    function toggleExpand(id: number) {
        setExpandedIds((s) => ({...s, [id]: !s[id]}));
    }

    function highlightPhrase(phrase: string, word: string) {
        const idx = phrase.toLowerCase().indexOf(word.toLowerCase());
        if (idx === -1) return phrase;
        const before = phrase.slice(0, idx);
        const match = phrase.slice(idx, idx + word.length);
        const after = phrase.slice(idx + word.length);
        return (
            <span>
                {before}
                <mark className="mark-highlight">{match}</mark>
                {after}
            </span>
        );
    }

    return (
        <div>
            <div className="mb-3 text-muted">
                <strong>Totals:</strong> {rows.length} analyses · {totalPosPhrases} positive phrases
                · {totalNegPhrases} negative phrases
            </div>

            <section className="responsive-grid">
                <div className="card card-positive">
                    <h2 className="m-0 mb-2 text-positive">Positive</h2>
                    <p className="m-0 mb-3 text-positive">{Object.keys(topPos).length} unique words</p>
                    <div className="cloud-area">
                        {/* light green base, darker green on hover is handled inside WordCloud */}
                        <WordCloud title="" wordCounts={topPos} fill="var(--positive)"
                                   onWordClickAction={(w) => toggleWord(w, 'positive')} wordType={1}/>
                    </div>
                </div>

                <div className="card card-negative">
                    <h2 className="m-0 mb-2 text-negative">Negative</h2>
                    <p className="m-0 mb-3 text-negative">{Object.keys(topNeg).length} unique words</p>
                    <div className="cloud-area">
                        {/* light red base, darker red on hover is handled inside WordCloud */}
                        <WordCloud title="" wordCounts={topNeg} fill="var(--negative)"
                                   onWordClickAction={(w) => toggleWord(w, 'negative')} wordType={-1}/>
                    </div>
                </div>
            </section>

            <div className="mt-7">
                {selected ? (
                    <div>
                        <h3 className="m-0">Analyses containing &quot;{selected.word}&quot; ({selected.polarity})</h3>
                        <p className="text-muted">{matchingAnalyses.length} analyses matched</p>
                        <div className="grid-gap-12 mt-3">
                            {matchingAnalyses.map((r) => (
                                <div key={r.id} className="analysis-card">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold">Analysis #{r.id}</div>
                                            <div className="text-muted text-xs">
                                                {r.transcript_id ? `Transcript ${r.transcript_id} · ` : ''}{r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => toggleExpand(r.id)}
                                                    className={`btn-toggle ${expandedIds[r.id] ? 'btn-expanded' : ''}`}>
                                                {expandedIds[r.id] ? 'Collapse' : 'Expand'}
                                            </button>
                                        </div>
                                    </div>

                                    {expandedIds[r.id] ? (
                                        <div className="mt-2">
                                            <div className="mb-2">
                                                <strong>Summary</strong>
                                                <div className="mt-1 text-foreground">{r.summary ??
                                                    <em className="text-muted">No summary</em>}</div>
                                            </div>

                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <strong className="text-positive">Positive phrases</strong>
                                                    <div className="mt-1">
                                                        {(r.positive_feedback ?? []).length === 0 ?
                                                            <div className="text-muted">None</div> : (
                                                                (r.positive_feedback ?? []).map((p, i) => (
                                                                    <div key={i}
                                                                         className="p-1">{highlightPhrase(p, selected.word)}</div>
                                                                ))
                                                            )}
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    <strong className="text-negative">Negative phrases</strong>
                                                    <div className="mt-1">
                                                        {(r.negative_feedback ?? []).length === 0 ?
                                                            <div className="text-muted">None</div> : (
                                                                (r.negative_feedback ?? []).map((p, i) => (
                                                                    <div key={i}
                                                                         className="p-1">{highlightPhrase(p, selected.word)}</div>
                                                                ))
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ))}

                            {matchingAnalyses.length === 0 ? (
                                <div className="text-muted">No analyses contain that phrase.</div>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="text-muted">Click a word in either cloud to see matching analyses here.</div>
                )}
            </div>
        </div>
    );
}
