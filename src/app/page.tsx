"use client";

import React, {useCallback, useRef, useState} from "react";
import {useRouter} from 'next/navigation';
import Link from "next/link";
import Image from "next/image";

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
        <div className="text-center mt-12">

    <Image src="/favicon.png" alt="Our company logo" width={250} height={250} className="mx-auto"/>

        <h1 className="text-4xl font-bold text-black dark:text-black mb-6">
          Our Mission
        </h1>
        <p className="text-lg text-black dark:text-black max-w-2xl mx-auto mb-10">
        Our mission is to transform raw conversation transcripts into actionable intelligence. CLP instantly distills the essence of any dialogue, surfacing the critical pros and cons for rapid evaluation, and providing an intuitive, conversational AI to summarize and answer any remaining questions about the details. 
        </p>
        <Link
          href="/about"
          className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Learn More About Us
        </Link>
      </div>
    );
}