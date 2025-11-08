"use client";

import React, {useCallback, useRef, useState} from "react";

export default function Home() {
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<number | null>(null);
    const [lines, setLines] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const reset = () => {
        setError(null);
        setFileName(null);
        setFileSize(null);
    };

    const parseText = (text: string) => {
        const splitLines = text.split(/\r?\n/);
        setLines(splitLines);
    };

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
        reader.onload = () => {
            const text = String(reader.result ?? "");
            parseText(text);
        };
        reader.onerror = () => {
            setError("Failed to read file.");
        };
        reader.readAsText(file);
    }, []);

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main
            className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-20 px-6 bg-white dark:bg-black">

            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center hover:border-zinc-400 dark:bg-[#0b0b0b]"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    onChange={onFileChange}
                    className="hidden"
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

            <div className="mt-8 w-full max-w-2xl">
                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {!fileName && !error && (
                    <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                        No file selected
                    </div>
                )}

                {fileName && (
                    <div className="mt-4 rounded-md border border-zinc-100 bg-zinc-50 p-4 dark:border-[#222]">
                        <div className="mb-2 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-50">
                                    {fileName}
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {fileSize} bytes
                                </div>
                            </div>
                            <div>
                                <button
                                    onClick={() => reset()}
                                    className="rounded-md bg-zinc-100 px-3 py-1 text-sm hover:bg-zinc-200 dark:bg-zinc-900"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="mt-2 text-sm">
                            <div className="mb-2 text-xs text-zinc-500">Summary</div>
                            <div className="grid grid-cols-3 gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                                <div>Lines: {lines.length}</div>
                                <div>
                                    Non-empty lines:{" "}
                                    {lines.filter((l) => l.trim().length > 0).length}
                                </div>
                            </div>

                            <div className="mt-4 text-xs text-zinc-500">
                                Preview (first 20 lines)
                            </div>
                            <div
                                className="mt-2 max-h-64 overflow-auto rounded border border-zinc-100 bg-white p-3 text-xs text-zinc-800 dark:bg-[#060606] dark:text-zinc-200">
                                {lines.length === 0 ? (
                                    <div className="text-zinc-400">(empty file)</div>
                                ) : (
                                    <ol className="ml-4 list-decimal">
                                        {lines.slice(0, 20).map((l, i) => (
                                            <li key={i} className="mb-1">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="whitespace-pre-wrap break-words">
                                                        {l || (
                                                            <span className="text-zinc-400">(blank)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        </div>
                    </div>
                )}
        </div>
      </main>
    </div>
  );
}
