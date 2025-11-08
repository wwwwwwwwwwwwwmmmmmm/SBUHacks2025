import React from "react";
import {createClient} from "@/utils/supabase/server";
import WordCloud from "../../components/WordCloud";

// Define the Analysis schema to match your database table (analyses)
type Analysis = {
    id: number;
    transcript_id: number | null;
    summary: string | null;
    positive_feedback: string[] | null; // JSONB array of strings
    negative_feedback: string[] | null; // JSONB array of strings
    created_at: string | null; // ISO timestamp string from the DB
};

function cleanAndSplit(text: string) {
    // Lowercase, remove punctuation (basic), split on whitespace
    return text
        .toLowerCase()
        // replace any non-alphanumeric (a-z0-9) and non-space characters with a space
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
}

const STOP_WORDS = new Set([
    "the",
    "and",
    "a",
    "an",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "is",
    "it",
    "was",
    "i",
    "we",
    "they",
    "that",
    "this",
    "are",
    "be",
    "but",
    "not",
    "have",
    "has",
    "my",
    "our",
]);

function getTopCounts(counts: Record<string, number>, topN = 60) {
    return Object.fromEntries(
        Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN),
    );
}

export default async function ResultsPage() {
    const supabase = await createClient();

    // Query analyses (use two generics to satisfy Supabase v2 typings)
    const {data, error} = await supabase
        .from<"analyses", Analysis>("analyses")
        .select("id, transcript_id, summary, positive_feedback, negative_feedback, created_at")
        .order("created_at", {ascending: false});

    if (error) {
        return (
            <main style={{
                padding: 40,
                fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            }}>
                <h1 style={{marginBottom: 12}}>Analyses</h1>
                <div style={{color: "red"}}>Error loading analyses: {error.message}</div>
            </main>
        );
    }

    const rows: Analysis[] = (data ?? []) as Analysis[];

    // Aggregate word counts across all analyses
    const posCounts: Record<string, number> = {};
    const negCounts: Record<string, number> = {};

    for (const row of rows) {
        const pos = Array.isArray(row.positive_feedback) ? row.positive_feedback : [];
        const neg = Array.isArray(row.negative_feedback) ? row.negative_feedback : [];

        for (const phrase of pos) {
            if (!phrase || phrase.trim() === "") continue;
            for (const token of cleanAndSplit(phrase)) {
                if (STOP_WORDS.has(token) || token.length <= 2) continue;
                posCounts[token] = (posCounts[token] || 0) + 1;
            }
        }

        for (const phrase of neg) {
            if (!phrase || phrase.trim() === "") continue;
            for (const token of cleanAndSplit(phrase)) {
                if (STOP_WORDS.has(token) || token.length <= 2) continue;
                negCounts[token] = (negCounts[token] || 0) + 1;
            }
        }
    }

    // Limit to top N words for nicer visuals
    const TOP_N = 60;
    const topPos = getTopCounts(posCounts, TOP_N);
    const topNeg = getTopCounts(negCounts, TOP_N);

    // Simple stats
    const totalPosPhrases = rows.reduce((acc, r) => acc + (Array.isArray(r.positive_feedback) ? r.positive_feedback.length : 0), 0);
    const totalNegPhrases = rows.reduce((acc, r) => acc + (Array.isArray(r.negative_feedback) ? r.negative_feedback.length : 0), 0);

    return (
        <main
            style={{padding: 40, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"}}>
            <header style={{marginBottom: 20}}>
                <h1 style={{fontSize: 28, margin: 0}}>Feedback Word Clouds</h1>
                <p style={{margin: "8px 0 0 0", color: "#555"}}>Aggregated from {rows.length} analyses
                    — {totalPosPhrases} positive phrases, {totalNegPhrases} negative phrases</p>
            </header>

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
                        <WordCloud title="" wordCounts={topPos} fill="#059669"/>
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
                        <WordCloud title="" wordCounts={topNeg} fill="#dc2626"/>
                    </div>
                </div>
            </section>

            <footer style={{marginTop: 28, color: "#666"}}>
                <small>Word clouds show top {TOP_N} words by frequency (stop words removed).</small>
            </footer>
        </main>
    );
}
