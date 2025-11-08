"use client";

import React, { useState, useRef, useEffect } from "react";

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
      // --- NeuralSeek API call ---
      const apiKey = process.env.NEURALSEEK_API_KEY; // add your key in .env
      const response = await fetch('https://api.neuralseek.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          message: input,
          // Add additional fields as required by NeuralSeek agent
          agent: 'default',
          sessionId: 'your-session-id',
        }),
      });

      const data = await response.json();
      const aiMessage = { role: 'ai' as const, text: data.reply || '<No response>' };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI call failed', err);
      const aiMessage = { role: 'ai' as const, text: 'Failed to get response from AI.' };
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
              m.role === 'user'
                ? 'ml-auto bg-blue-500 text-white max-w-[55%]'
                : 'mr-auto bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white max-w-[55%]'
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
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
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
