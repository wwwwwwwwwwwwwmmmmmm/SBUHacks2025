"use client";

import React, {useEffect, useRef, useState} from "react";

const sessionHolder = 100;

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
      if (!apiKey) throw new Error("NeuralSeek API key not set");

      // Add empty AI message first so we can append chunks
      const aiMessage: { role: "ai"; text: string } = { role: "ai", text: "" };
      const aiMessageIndex = messages.length + 1;
      setMessages((prev) => [...prev, aiMessage]);

      const response = await fetch(
        "https://stagingapi.neuralseek.com/v1/stony18/seek",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
          },
          body: JSON.stringify({
            question: input,
            user_session: {
              // metadata: { user_id: sessionHolder },
              system: { session_id: sessionHolder },
            },
            options: {
              streaming: true,
            },
            "promptEngineering": "true",
            "promptEngineeringPhrase": "You are interacting only with management and providing data and insight into some form of uploaded transcripts, you are not interfacing with customers. Be assertive and act like a helpful customer service representative. All prompts are to be assumed in relation to the knowledge base documents.",
            "lastTurn": [
              {
                "input": messages[messages.length - 2],
                "response": messages[messages.length - 1]
              }
            ],
          }),
        }
    );

    if (!response.body) throw new Error("ReadableStream not supported");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // NeuralSeek sends chunks separated by newlines
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep incomplete line for next read

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const json = JSON.parse(line.replace(/^data:\s*/, ""));
          if (json.chunk) {
            // append to AI message
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[aiMessageIndex] = {
                ...newMessages[aiMessageIndex],
                text: newMessages[aiMessageIndex].text + json.chunk,
              };
              return newMessages;
            });
          }
        } catch (err) {
          console.warn("Failed to parse chunk", line, err);
        }
      }
    }
    } catch (err) {
    console.error("AI call failed", err);
        // Prefer Error message when available (avoid `any` for lint rules)
        let msg: string;
        if (err instanceof Error) msg = err.message;
        else msg = String(err);
        const aiMessage = {role: "ai" as const, text: `Failed to get response: ${msg}`};
    setMessages((prev) => [...prev, aiMessage]);
    }
  };
// console.log(messages)


  return (
      <div className="flex flex-col h-screen w-full bg-background p-2">
      {/* Chat messages */}
          <div
              className="flex-1 w-full max-w-7xl mx-auto overflow-auto mb-2 p-2 rounded-lg bg-card border border-card-border flex flex-col gap-2">
        {messages.length === 0 && (
            <div className="text-muted text-center mt-2">Start chatting...</div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`inline-block p-3 rounded-lg whitespace-pre-wrap break-words transition-all duration-300 ease-in-out transform hover:scale-105 ${
              m.role === "user"
                  ? "ml-auto bg-primary text-on-primary max-w-[55%]"
                  : "mr-auto bg-card text-foreground max-w-[55%]"
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
          className="flex-1 p-3 rounded-lg border border-card-border bg-card text-foreground"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-strong text-on-primary"
        >
          Send
        </button>
      </div>
    </div>
  );
}
