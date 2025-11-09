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
                <mark style={{background: "#fffbcc"}}>{match}</mark>
                {after}
            </span>
        );
    }

    return (
        <div>
            <div style={{marginBottom: 12, color: '#444'}}>
                <strong>Totals:</strong> {rows.length} analyses · {totalPosPhrases} positive phrases
                · {totalNegPhrases} negative phrases
            </div>
            <section style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24}}>
                <div style={{
                    background: "linear-gradient(180deg,#f0fdf4,#ffffff)",
                    padding: 18,
                    borderRadius: 12,
                    boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
                    border: "1px solid rgba(16,185,129,0.08)"
                }}>
                    <h2 style={{marginTop: 0, marginBottom: 8, color: "#065f46"}}>Positive</h2>
                    <p style={{marginTop: 0, marginBottom: 12, color: "#065f46"}}>{Object.keys(topPos).length} unique
                        words</p>
                    <div style={{width: "100%", height: 420}}>
                        {/* light green base, darker green on hover is handled inside WordCloud */}
                        <WordCloud title="" wordCounts={topPos} fill="#0bf7f0"
                                   onWordClickAction={(w) => toggleWord(w, 'positive')} wordType={1}/>
                    </div>
                </div>

                <div style={{
                    background: "linear-gradient(180deg,#fff7f6,#ffffff)",
                    padding: 18,
                    borderRadius: 12,
                    boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
                    border: "1px solid rgba(239,68,68,0.06)"
                }}>
                    <h2 style={{marginTop: 0, marginBottom: 8, color: "#7f1d1d"}}>Negative</h2>
                    <p style={{marginTop: 0, marginBottom: 12, color: "#7f1d1d"}}>{Object.keys(topNeg).length} unique
                        words</p>
                    <div style={{width: "100%", height: 420}}>
                        {/* light red base, darker red on hover is handled inside WordCloud */}
                        <WordCloud title="" wordCounts={topNeg} fill="#FF0B0B"
                                   onWordClickAction={(w) => toggleWord(w, 'negative')} wordType={-1}/>
                    </div>
                </div>
            </section>

            <div style={{marginTop: 28}}>
                {selected ? (
                    <div>
                        <h3 style={{margin: 0}}>Analyses
                            containing &quot;{selected.word}&quot; ({selected.polarity})</h3>
                        <p style={{color: "#555"}}>{matchingAnalyses.length} analyses matched</p>
                        <div style={{marginTop: 12, display: "grid", gap: 12}}>
                            {matchingAnalyses.map((r) => (
                                <div key={r.id} style={{border: "1px solid #e6e6e6", padding: 12, borderRadius: 8}}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}>
                                        <div>
                                            <div style={{fontWeight: 600}}>Analysis #{r.id}</div>
                                            <div style={{color: "#666", fontSize: 13}}>
                                                {r.transcript_id ? `Transcript ${r.transcript_id} · ` : ''}{r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                                            </div>
                                        </div>
                                        <div style={{display: "flex", gap: 8, alignItems: "center"}}>
                                            <button onClick={() => toggleExpand(r.id)} style={{
                                                padding: '6px 10px',
                                                borderRadius: 6,
                                                border: '1px solid #ccc',
                                                background: expandedIds[r.id] ? '#f3f4f6' : '#fff'
                                            }}> {expandedIds[r.id] ? 'Collapse' : 'Expand'}</button>
                                        </div>
                                    </div>

                                    {expandedIds[r.id] ? (
                                        <div style={{marginTop: 10}}>
                                            <div style={{marginBottom: 8}}>
                                                <strong>Summary</strong>
                                                <div style={{marginTop: 6, color: '#00000'}}>{r.summary ??
                                                    <em style={{color: '#666'}}>No summary</em>}</div>
                                            </div>

                                            <div style={{display: 'flex', gap: 12}}>
                                                <div style={{flex: 1}}>
                                                    <strong style={{color: '#065f46'}}>Positive phrases</strong>
                                                    <div style={{marginTop: 6}}>
                                                        {(r.positive_feedback ?? []).length === 0 ?
                                                            <div style={{color: '#666'}}>None</div> : (
                                                                (r.positive_feedback ?? []).map((p, i) => (
                                                                    <div key={i}
                                                                         style={{padding: 4}}>{highlightPhrase(p, selected.word)}</div>
                                                                ))
                                                            )}
                                                    </div>
                                                </div>

                                                <div style={{flex: 1}}>
                                                    <strong style={{color: '#7f1d1d'}}>Negative phrases</strong>
                                                    <div style={{marginTop: 6}}>
                                                        {(r.negative_feedback ?? []).length === 0 ?
                                                            <div style={{color: '#666'}}>None</div> : (
                                                                (r.negative_feedback ?? []).map((p, i) => (
                                                                    <div key={i}
                                                                         style={{padding: 4}}>{highlightPhrase(p, selected.word)}</div>
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
                                <div style={{color: '#666'}}>No analyses contain that phrase.</div>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div style={{color: '#666'}}>Click a word in either cloud to see matching analyses here.</div>
                )}
            </div>
        </div>
    );
}
