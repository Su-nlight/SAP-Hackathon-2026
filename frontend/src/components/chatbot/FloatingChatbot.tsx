
"use client";

import { useState } from "react";
import {
  Bot,
  X,
  Send,
  Minimize2,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  sendChatMessage,
  type ChatMessageDTO,
} from "@/app/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = ChatMessageDTO & {
  id: string;
};

const createMessage = (
  role: ChatMessageDTO["role"],
  content: string
): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
});

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "Hello! I'm your AI assistant. How can I help you today?"
    ),
  ]);

  async function handleSendMessage() {
    const text = input.trim();

    if (!text || isLoading) return;

    const userMessage = createMessage("user", text);

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: text,
      });

      const assistantText =
        response.answer ??
        response.response ??
        response.message ??
        "I received an empty response.";

      const assistantMessage = createMessage(
        "assistant",
        assistantText
      );

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("Chatbot request failed:", error);

      const errorMessage = createMessage(
        "assistant",
        "Sorry, I couldn't connect to the AI service. Please try again."
      );

      setMessages((previous) => [
        ...previous,
        errorMessage,
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  }

  function clearChat() {
    if (isLoading) return;

    setMessages([
      createMessage(
        "assistant",
        "Chat cleared. How can I help you?"
      ),
    ]);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen && (
        <div
          className="
            mb-4 flex h-[min(600px,calc(100vh-120px))]
            w-[min(400px,calc(100vw-32px))]
            flex-col overflow-hidden rounded-2xl
            border border-white/10 bg-slate-950
            shadow-2xl shadow-black/40
          "
        >
          {/* Header */}
          <div
            className="
              flex items-center justify-between
              border-b border-white/10
              bg-slate-900 px-4 py-3
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-xl bg-cyan-500/15 text-cyan-400
                "
              >
                <Bot size={21} />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  AI Assistant
                </p>

                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <span className="text-xs text-slate-400">
                    SAP Assistant
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                disabled={isLoading}
                aria-label="Clear chat"
                className="
                  rounded-lg p-2 text-slate-400
                  transition hover:bg-white/10
                  hover:text-white disabled:opacity-40
                "
              >
                <Trash2 size={16} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Minimize chatbot"
                className="
                  rounded-lg p-2 text-slate-400
                  transition hover:bg-white/10
                  hover:text-white
                "
              >
                <Minimize2 size={17} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
                className="
                  rounded-lg p-2 text-slate-400
                  transition hover:bg-white/10
                  hover:text-white
                "
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="
              flex-1 space-y-4 overflow-y-auto
              p-4
            "
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap
                    break-words rounded-2xl px-3.5 py-2.5
                    text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-md bg-cyan-500 text-slate-950"
                      : "rounded-bl-md bg-white/10 text-slate-200"
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        table: ({ children }) => (
                        <div className="my-3 overflow-x-auto rounded-lg border border-white/10">
                            <table className="w-full text-left text-sm">
                            {children}
                            </table>
                        </div>
                        ),

                        thead: ({ children }) => (
                        <thead className="bg-white/10 text-slate-200">
                            {children}
                        </thead>
                        ),

                        th: ({ children }) => (
                        <th className="px-3 py-2 font-semibold">
                            {children}
                        </th>
                        ),

                        td: ({ children }) => (
                        <td className="border-t border-white/10 px-3 py-2 text-slate-300">
                            {children}
                        </td>
                        ),

                        p: ({ children }) => (
                        <p className="mb-2 last:mb-0">
                            {children}
                        </p>
                        ),

                        strong: ({ children }) => (
                        <strong className="font-semibold text-white">
                            {children}
                        </strong>
                        ),

                        code: ({ children }) => (
                        <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-300">
                            {children}
                        </code>
                        ),

                        ul: ({ children }) => (
                        <ul className="my-2 list-disc space-y-1 pl-5">
                            {children}
                        </ul>
                        ),

                        ol: ({ children }) => (
                        <ol className="my-2 list-decimal space-y-1 pl-5">
                            {children}
                        </ol>
                        ),
                    }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="
                    flex items-center gap-2 rounded-2xl
                    rounded-bl-md bg-white/10
                    px-3.5 py-2.5 text-sm text-slate-400
                  "
                >
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-3">
            <div
              className="
                flex items-end gap-2 rounded-xl
                border border-white/10 bg-slate-900
                p-2
              "
            >
              <textarea
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI assistant..."
                rows={1}
                disabled={isLoading}
                className="
                  max-h-32 min-h-10 flex-1 resize-none
                  bg-transparent px-2 py-2
                  text-sm text-white outline-none
                  placeholder:text-slate-500
                "
              />

              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="
                  flex h-10 w-10 shrink-0 items-center
                  justify-center rounded-lg
                  bg-cyan-500 text-slate-950
                  transition hover:bg-cyan-400
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <Send size={17} />
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-500">
              AI-generated responses may contain errors.
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI assistant"
          className="
            group relative flex h-14 w-14
            items-center justify-center
            rounded-full bg-cyan-500 text-slate-950
            shadow-lg shadow-cyan-500/20
            transition duration-300
            hover:scale-105 hover:bg-cyan-400
            focus:outline-none focus:ring-2
            focus:ring-cyan-400 focus:ring-offset-2
            focus:ring-offset-slate-950
          "
        >
          <Sparkles
            size={23}
            className="transition group-hover:rotate-12"
          />

          <span
            className="
              absolute -right-1 -top-1
              h-3 w-3 rounded-full
              border-2 border-slate-950
              bg-emerald-400
            "
          />
        </button>
      )}
    </div>
  );
}