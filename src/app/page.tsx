"use client";

import React, {useCallback, useRef, useState} from "react";
import {useRouter} from 'next/navigation';

interface AiResult {
    summary: string;
    positive_feedback?: string[];
    negative_feedback?: string[];
    transcriptId?: number | null;
    analysisId?: number | null;
    lineCount?: number;
    topWords?: string[];
}

export default function Home() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<number | null>(null);
    const [lines, setLines] = useState<string[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const [publicUrl, setPublicUrl] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<AiResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const reset = () => {
        setError(null);
        setFileName(null);
        setFileSize(null);
        setPublicUrl(null);
        setAiResult(null);
        setLines([]);
    };

    const parseText = (text: string) => {
        const splitLines = text.split(/\r?\n/);
        setLines(splitLines);
    };

    const uploadToServer = useCallback(async (file: File) => {
        setUploading(true);
        setError(null);
        setPublicUrl(null);
        setAiResult(null);
        let didRedirect = false;
        try {
            const fd = new FormData();
            fd.append("file", file, file.name);

            const res = await fetch("/api/upload-file", {
                method: "POST",
                body: fd,
            });

            const json = await res.json();
            if (!res.ok) {
                setError(json?.error || "Upload failed");
                return;
            }

            setPublicUrl(json.publicUrl ?? null);

            const ai = json.ai ?? null;
            if (ai) {
                // compute simple stats locally
                const currentLines = lines;
                const lineCount = currentLines.length;
                const words = currentLines.join(' ').split(/\s+/).filter(Boolean);
                const freq: Record<string, number> = {};
                for (const w of words) {
                    const wnorm = w.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (!wnorm) continue;
                    freq[wnorm] = (freq[wnorm] || 0) + 1;
                }
                const topWords = Object.entries(freq)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map((e) => e[0]);

                const enhancedAi: AiResult = {
                    summary: ai.summary ?? '',
                    positive_feedback: ai.positive_feedback ?? ai.positiveFeedback ?? [],
                    negative_feedback: ai.negative_feedback ?? ai.negativeFeedback ?? [],
                    // Align with DB schema returned by the server: analyses row contains `id` and `transcript_id`
                    transcriptId: ai.transcript_id ?? ai.transcriptId ?? null,
                    analysisId: ai.id ?? ai.analysisId ?? ai.analysis_id ?? null,
                    lineCount,
                    topWords,
                };

                setAiResult(enhancedAi);

                // Redirect to results only if both DB ids are present (meaning both transcript and analysis were saved)
                const tId = enhancedAi.transcriptId;
                const aId = enhancedAi.analysisId;
                if (tId && aId) {
                    // redirect to aggregate results page (no individual IDs in URL)
                    didRedirect = true;
                    router.push('/results');
                    return;
                } else {
                    setError('Upload succeeded but DB insert incomplete (missing IDs).');
                }
            } else {
                setError('No AI result returned from server.');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            if (!didRedirect) setUploading(false);
        }
    }, [lines, router]);

    const handleFile = useCallback((file: File) => {
        reset();
        if (!file) return;
        if (!file.type.startsWith("text/") && !file.name.endsWith(".txt")) {
            setError("Please provide a .txt text file.");
            return;
        }
        setFileName(file.name);
        setFileSize(file.size);

        const reader = new FileReader();
        reader.onload = async () => {
            const text = String(reader.result ?? "");
            parseText(text);
            // upload-file in background and get AI result
            await uploadToServer(file);
        };
        reader.onerror = () => {
            setError("Failed to read file.");
        };
        reader.readAsText(file);
    }, [uploadToServer]);

    const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (!file) {
            setError("No file dropped.");
            return;
        }
        handleFile(file);
    };

    const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        handleFile(file);
    };

    return (
        <div
            className="flex min-h-screen items-center justify-center font-sans bg-zinc-50 dark:bg-gray-900"
            // style={{ backgroundImage: "url('/call.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
        >
            <main
                className="flex min-h-screen w-full m-20 flex-col items-center py-20 px-6 ">

                <div className="w-full flex flex-col md:flex-row items-stretch gap-10">
                    {/* Left: Mission text */}
                    <section className="md:w-3/5 flex flex-col justify-start">
                        <div className="bg-white p-8 rounded-lg shadow-md">
                            <h1 className="text-4xl font-bold text-black mb-6">
                                Our Mission
                            </h1>
                            <p className="text-lg text-black max-w-2xl mb-10">
                                Our mission is to transform raw conversation transcripts into actionable intelligence.
                                CLP instantly
                                distills the essence of any dialogue, surfacing the critical pros and cons for rapid
                                evaluation, and
                                providing an intuitive, conversational AI to summarize and answer any remaining
                                questions about the
                                details.
                            </p>
                            {/*
                            <Link
                                href="/about"
                                className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
                            >
                                Learn More About Us
                            </Link>
                            */}
                        </div>
                    </section>

                    {/* Right: Upload box + details */}
                    <section className="md:w-3/5 flex flex-col items-center">
                        <div
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                if (!uploading) fileInputRef.current?.click();
                            }}
                            className={`flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center hover:border-zinc-400 dark:bg-[#0b0b0b] ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,text/plain"
                                onChange={onFileChange}
                                className="hidden"
                                disabled={uploading}
                            />

                            <div className="flex flex-col items-center gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-12 w-12 text-zinc-600"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4 4 4"/>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                </svg>
                                <div className="text-lg font-medium text-zinc-800 dark:text-zinc-50">
                                    Drop a .txt file here or click to upload
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 w-full">
                            {error && (
                                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {!fileName && !error && (
                                <div className="mt-4 text-sm text-muted">
                                    No file selected
                                </div>
                            )}

                            {fileName && (
                                <div className="mt-4 rounded-md border border-card-border bg-card p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-foreground">
                                                {fileName}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {fileSize} bytes
                                            </div>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => reset()}
                                                className="rounded-md btn-toggle px-3 py-1 text-sm"
                                                disabled={uploading}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-sm">
                                        <div className="mb-2 text-xs text-muted">Summary</div>
                                        <div className="grid grid-cols-3 gap-2 text-sm text-foreground">
                                            <div>Lines: {lines.length}</div>
                                            <div>
                                                Non-empty lines:{" "}
                                                {lines.filter((l) => l.trim().length > 0).length}
                                            </div>
                                            <div>
                                                {uploading ? (
                                                    <span className="text-xs text-muted">Uploading...</span>
                                                ) : publicUrl ? (
                                                    <a className="text-xs text-primary" href={publicUrl} target="_blank"
                                                       rel="noreferrer">View file</a>
                                                ) : (
                                                    <span className="text-xs text-muted">Not uploaded</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 text-xs text-muted">
                                            Preview (first 20 lines)
                                        </div>
                                        <div
                                            className="mt-2 max-h-64 overflow-auto rounded border border-card-border bg-card p-3 text-xs text-foreground">
                                            {lines.length === 0 ? (
                                                <div className="text-muted">(empty file)</div>
                                            ) : (
                                                <ol className="ml-4 list-decimal">
                                                    {lines.slice(0, 20).map((l, i) => (
                                                        <li key={i} className="mb-1">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="whitespace-pre-wrap break-words">
                                                                    {l || (
                                                                        <span className="text-muted">(blank)</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ol>
                                            )}
                                        </div>

                                        {/* AI result */}
                                        <div className="mt-4 text-sm">
                                            <div className="mb-1 text-xs text-muted">AI analysis</div>
                                            {uploading && <div className="text-xs text-muted">Processing...</div>}
                                            {!uploading && aiResult && (
                                                <div className="rounded bg-card p-3 text-xs text-foreground">
                                                    <div className="mb-1"><strong>Summary:</strong> {aiResult.summary}
                                                    </div>
                                                    <div
                                                        className="text-xs text-muted">Lines: {aiResult.lineCount}</div>
                                                    {aiResult.topWords && (
                                                        <div className="mt-2 text-xs">Top
                                                            words: {aiResult.topWords.join(", ")}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

            </main>
        </div>
    );
}