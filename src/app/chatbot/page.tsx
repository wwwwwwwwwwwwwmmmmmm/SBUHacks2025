"use client";

import React, {useEffect, useRef, useState} from "react";

const sessionHolder = 100;

type Message = { role: "user" | "ai"; text: string };
type Chat = { id: string; title?: string; messages: Message[]; updatedAt: number };

const STORAGE_KEY = "clp_recent_chats_v1";
const MAX_RECENTS = 20;

export default function ChatPage() {
    // Start empty; initialize on mount asynchronously to avoid impure render calls
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const currentChatIdRef = useRef<string | null>(null);
    const selectChat = (id: string | null) => {
        setCurrentChatId(id);
        currentChatIdRef.current = id;
    };
    const [input, setInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    // track whether we're actively streaming AI text into the chat
    const [isStreaming, setIsStreaming] = useState(false);

    // Initialize from localStorage on mount (deferred to avoid lint issues)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed: Chat[] = JSON.parse(raw);
                // Defer setting state to avoid "set-state-in-effect" lint warning
                setTimeout(() => {
                    setChats(parsed);
                    if (parsed.length > 0) selectChat(parsed[0].id);
                }, 0);
            } else {
                setTimeout(() => {
                    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
                    const newChat: Chat = {id, messages: [], updatedAt: Date.now()};
                    setChats([newChat]);
                    selectChat(id);
                }, 0);
            }
        } catch (err) {
            console.warn("Failed to initialize chats", err);
        }
    }, []);

    // Persist chats
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, MAX_RECENTS)));
        } catch (e) {
            console.warn("Failed to save chats", e);
        }
    }, [chats]);

    const currentChat = chats.find((c) => c.id === currentChatId) ?? null;

    // Scroll to bottom whenever current chat messages change
    useEffect(() => {
        // Scroll to bottom whenever messages change
        chatEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [currentChat?.messages.map(m => m.text).join("\n")]); // watch combined text


    const createNewChat = (clearInput = true) => {
        const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
        const newChat: Chat = {id, messages: [], updatedAt: Date.now()};
        setChats((prev) => [newChat, ...prev].slice(0, MAX_RECENTS));
        selectChat(id);
        if (clearInput) setInput("");
        return id;
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        // Ensure there's a chat to attach the message to
        // prefer the ref which may have been set synchronously during onChange
        let chatIdForStream = currentChatIdRef.current ?? currentChatId;
        if (!chatIdForStream) {
            chatIdForStream = createNewChat(false);
        }

        const messageText = input.trim();
        setInput("");

        // Add user message and placeholder AI message atomically to target chat
        setChats((prev) => {
            const clone = prev.map((c) => ({...c, messages: [...c.messages]}));
            let idx = clone.findIndex((c) => c.id === chatIdForStream);
            if (idx === -1) {
                // If for some reason the chat wasn't present, create it at front
                const newChat: Chat = {id: chatIdForStream!, messages: [], updatedAt: Date.now()};
                clone.unshift(newChat);
                idx = 0;
            }
            const chat = clone[idx];
            chat.messages.push({role: "user", text: messageText});
            chat.messages.push({role: "ai", text: ""});
            chat.updatedAt = Date.now();
            // move selected chat to top (recent)
            return [chat, ...clone.filter((_, i) => i !== idx)].slice(0, MAX_RECENTS);
        });

        try {
            const apiKey = process.env.NEXT_PUBLIC_NEURALSEEK_API_KEY;
            if (!apiKey) {
                const aiMessage = {role: "ai" as const, text: "Failed to get response: NeuralSeek API key not set"};
                setChats((prev) => {
                    const clone = prev.map((c) => ({...c, messages: [...c.messages]}));
                    const idx = clone.findIndex((c) => c.id === chatIdForStream);
                    if (idx === -1) return prev;
                    clone[idx].messages.push(aiMessage);
                    clone[idx].updatedAt = Date.now();
                    return clone;
                });
                return;
            }

            const response = await fetch(
                "https://stagingapi.neuralseek.com/v1/stony18/seek",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: apiKey,
                    },
                    body: JSON.stringify({
                        question: messageText,
                        user_session: {
                            system: {session_id: sessionHolder},
                        },
                        options: {streaming: true},
                        promptEngineering: "true",
                        promptEngineeringPhrase:
                            "You are interacting only with management and providing data and insight into some form of uploaded transcripts, you are not interfacing with customers. Be assertive and act like a helpful customer service representative. All prompts are to be assumed in relation to the knowledge base documents.",
                        lastTurn: [],
                    }),
                }
            );

            if (!response.body) {
                const aiMessage = {role: "ai" as const, text: "Failed to get response: ReadableStream not supported"};
                setChats((prev) => {
                    const clone = prev.map((c) => ({...c, messages: [...c.messages]}));
                    const idx = clone.findIndex((c) => c.id === chatIdForStream);
                    if (idx === -1) return prev;
                    clone[idx].messages.push(aiMessage);
                    clone[idx].updatedAt = Date.now();
                    return clone;
                });
                return;
            }

            // We have a stream; mark streaming state so the UI can disable input
            setIsStreaming(true);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, {stream: true});

                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    try {
                        const json = JSON.parse(line.replace(/^data:\s*/, ""));
                        if (json.chunk) {
                            // append chunk to AI placeholder of the target chat (functional update)
                            setChats((prev) => {
                                const clone = prev.map((c) => ({...c, messages: [...c.messages]}));
                                const cidx = clone.findIndex((c) => c.id === chatIdForStream);
                                if (cidx === -1) return prev;
                                const chat = clone[cidx];
                                // Ensure there's at least one AI message placeholder at the end
                                if (chat.messages.length === 0) {
                                    chat.messages.push({role: "ai", text: json.chunk});
                                } else {
                                    // find last ai message index (we appended one before)
                                    let lastAiIdx = -1;
                                    for (let i = chat.messages.length - 1; i >= 0; i--) {
                                        if (chat.messages[i].role === "ai") {
                                            lastAiIdx = i;
                                            break;
                                        }
                                    }
                                    if (lastAiIdx === -1) {
                                        chat.messages.push({role: "ai", text: json.chunk});
                                    } else {
                                        chat.messages[lastAiIdx] = {
                                            ...chat.messages[lastAiIdx],
                                            text: chat.messages[lastAiIdx].text + json.chunk,
                                        };
                                    }
                                }
                                chat.updatedAt = Date.now();
                                // move updated chat to top
                                return [chat, ...clone.filter((_, i) => i !== cidx)].slice(0, MAX_RECENTS);
                            });
                        }
                    } catch (err) {
                        console.warn("Failed to parse chunk", line, err);
                    }
                }
            }
            // finished streaming
            setIsStreaming(false);
        } catch (err) {
            console.error("AI call failed", err);
            let msg: string;
            if (err instanceof Error) msg = err.message;
            else msg = String(err);
            const aiMessage = {role: "ai" as const, text: `Failed to get response: ${msg}`};
            setChats((prev) => {
                const clone = prev.map((c) => ({...c, messages: [...c.messages]}));
                const idx = clone.findIndex((c) => c.id === chatIdForStream);
                if (idx === -1) return prev;
                clone[idx].messages.push(aiMessage);
                clone[idx].updatedAt = Date.now();
                return clone;
            });
            // ensure streaming flag is cleared on error
            setIsStreaming(false);
        }
    };

    return (
        // Use the app's page helpers so theming and spacing match other pages
        // fill the available height provided by the root layout and avoid re-calculating 100vh
        <div role="main" className="page-main h-full overflow-hidden box-border">

            <div className="flex gap-6 h-full">
                {/* Left sidebar with recent chats (bubbly) */}
                {/* sidebar is full-height; inner header stays fixed while the list scrolls */}
                <aside className="w-72 hidden sm:flex flex-col gap-3 card rounded-2xl shadow-sm p-2 h-full">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-m">Recent</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => createNewChat()}
                                    disabled={isStreaming}
                                    title={isStreaming ? "Waiting for response..." : "Create new chat"}
                                    className="px-4 py-1 rounded-full bg-transparent border-2 border-primary text-primary shadow-sm hover:bg-primary hover:text-on-primary transform transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    New
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex-1 flex flex-col">
                            {/* this area becomes the scrollable recent-list */}
                            <div
                                className="flex-1 overflow-auto p-2 scrollbar-thin scrollbar-thumb-primary/60 scrollbar-track-transparent hover:scrollbar-thumb-primary/80">
                                {chats.length === 0 && <div className="text-sm text-muted">No recent chats</div>}
                                <ul className="flex flex-col gap-2 mt-2">
                                    {chats.map((c, idx) => (
                                        <li
                                            key={c.id}
                                            className={`flex items-center justify-between p-2 rounded-2xl cursor-pointer truncate transition-colors duration-150 ${c.id === currentChatId ? "border-primary bg-primary shadow-md ring-2 ring-primary" : "border-transparent hover:border-primary hover:bg-card-border hover:ring-1 hover:ring-primary/20"}`}
                                            onClick={() => selectChat(c.id)}
                                            title={`Chat ${idx + 1}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <div
                                                        className="text-sm font-medium truncate">{`Chat ${idx + 1}`}</div>
                                                    <div
                                                        className="text-xs text-muted truncate">{(c.messages[c.messages.length - 1]?.text || "").slice(0, 60)}</div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main chat area */}
                <section className="flex-1 flex flex-col gap-4 h-full">
                    <div className="card rounded-2xl p-6 flex-1 flex flex-col min-h-0">
                        {/* scrollable message area */}
                        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
                            {!currentChat &&
                                <div className="text-center text-muted">Select or create a chat to start</div>}

                            {currentChat && currentChat.messages.length === 0 && (
                                <div className="text-sm text-muted text-center">Say hi — ask anything related to your
                                    transcripts</div>
                            )}

                            {currentChat?.messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`max-w-[65%] p-4 rounded-2xl whitespace-pre-wrap break-words text-sm relative z-20 blue-man
                                        ${m.role === "user"
                                        ? "ml-auto bg-primary border-primary/40 shadow-md shadow-primary/30 text-black dark:text-white"
                                        : "mr-auto bg-background shadow-md shadow-black/30 dark:shadow-white/10 text-black dark:text-white"
                                    }`}

                                >
                                    {m.text}
                                </div>
                            ))}

                            <div ref={chatEndRef}/>
                        </div>
                    </div>

                    {/* Input bar condensed and bubbly */}
                    <div className="flex gap-3 items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => {
                                // while streaming we don't create a new chat on first keystroke
                                if (!currentChatIdRef.current && !isStreaming) createNewChat(false);
                                setInput(e.target.value);
                            }}
                            onKeyDown={(e) => e.key === "Enter" && !isStreaming && sendMessage()}
                            disabled={isStreaming}
                            aria-disabled={isStreaming}
                            title={isStreaming ? "Waiting for response..." : undefined}
                            // while streaming disable the input so new text cannot be entered
                            className="flex-1 px-6 py-4 rounded-full border-2 border-card-border bg-background text-foreground text-sm shadow-sm"
                            placeholder={currentChat ? "Type a message..." : "Type to start a new chat..."}
                            // always enabled so user can start typing immediately
                        />
                        <button
                            onClick={sendMessage}
                            className="px-5 py-4 rounded-full bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-on-primary text-sm shadow-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isStreaming || !input.trim()}
                        >
                            Send
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
