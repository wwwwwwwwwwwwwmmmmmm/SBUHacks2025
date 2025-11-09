"use client";

import React, { useState, useRef, useEffect } from "react";

let sessionHolder = 100;

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user" as const, text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const apiKey = process.env.NEXT_PUBLIC_NEURALSEEK_API_KEY;
      if (!apiKey) throw new Error("NeuralSeek API key not set in env");

      const response = await fetch("https://stagingapi.neuralseek.com/v1/stony18/seek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey, // exactly like the cURL example
        },
        body: JSON.stringify({
          question: input, // minimal required field
          "user_session": {
            "metadata": {
              "user_id": sessionHolder
            },
            "system": {
              "session_id": sessionHolder
            }
          },
        }),
      });

      // NeuralSeek might return non-JSON on error, so check content-type first
      const contentType = response.headers.get("content-type") || "";
      let data: any = {};
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server did not return JSON: ${text}`);
      }

      const aiMessage = {
        role: "ai" as const,
        text: data.answer ?? data.response ?? "<No response received>",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error("AI call failed", err);
      const aiMessage = { role: "ai" as const, text: `Failed to get response from AI: ${err.message}` };
      setMessages((prev) => [...prev, aiMessage]);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-100 dark:bg-black p-2">
      {/* Chat messages */}
      <div className="flex-1 w-full max-w-7xl mx-auto overflow-auto mb-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-zinc-500 text-center mt-2">Start chatting...</div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`inline-block p-3 rounded-lg whitespace-pre-wrap break-words transition-all duration-300 ease-in-out transform hover:scale-105 ${
              m.role === "user"
                ? "ml-auto bg-blue-500 text-white max-w-[55%]"
                : "mr-auto bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white max-w-[55%]"
            }`}
          >
            {m.text}
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex w-full max-w-7xl mx-auto gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
