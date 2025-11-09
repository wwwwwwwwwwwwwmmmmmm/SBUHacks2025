import React from "react";
import {createClient} from "@/utils/supabase/server";
import ResultsClient from "./ResultsClient";

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

// Create contiguous n-grams (1..maxN) from a token array
function extractNgrams(tokens: string[], maxN = 3) {
    const ngrams: string[] = [];
    const n = tokens.length;
    for (let size = 1; size <= Math.min(maxN, n); size++) {
        for (let i = 0; i + size <= n; i++) {
            const slice = tokens.slice(i, i + size);
            ngrams.push(slice.join(" "));
        }
    }
    return ngrams;
}

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

        // process positive phrases
        for (const phrase of pos) {
            if (!phrase || phrase.trim() === "") continue;

            const tokens = cleanAndSplit(phrase);
            if (tokens.length === 0) continue;

            // get unigrams, bigrams, trigrams
            const ngrams = extractNgrams(tokens, 3);

            for (const ng of ngrams) {
                // skip very short joins
                if (ng.length <= 2) continue;

                // skip n-grams that are all stop words
                const parts = ng.split(" ");
                const allStop = parts.every(p => STOP_WORDS.has(p));
                if (allStop) continue;

                // also skip n-grams where every token is <=2 characters
                const anyLong = parts.some(p => p.length > 2);
                if (!anyLong) continue;

                posCounts[ng] = (posCounts[ng] || 0) + 1;
            }
        }

        // process negative phrases
        for (const phrase of neg) {
            if (!phrase || phrase.trim() === "") continue;

            const tokens = cleanAndSplit(phrase);
            if (tokens.length === 0) continue;

            const ngrams = extractNgrams(tokens, 3);

            for (const ng of ngrams) {
                if (ng.length <= 2) continue;

                const parts = ng.split(" ");
                const allStop = parts.every(p => STOP_WORDS.has(p));
                if (allStop) continue;

                const anyLong = parts.some(p => p.length > 2);
                if (!anyLong) continue;

                negCounts[ng] = (negCounts[ng] || 0) + 1;
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

            {/* Client component handles interactive clouds and analysis expansion */}
            <section>
                <ResultsClient rows={rows} topPos={topPos} topNeg={topNeg} totalPosPhrases={totalPosPhrases}
                               totalNegPhrases={totalNegPhrases}/>
            </section>
        </main>
    );
}
