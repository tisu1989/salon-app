import { useState } from "react";
import { useSendChatMessageMutation, type ChatMessage } from "./chat.api";
import styles from "./ChatWidget.module.css";

/**
 * A floating assistant chat, mounted once in AppShell so it's available on every page
 * after login. Message history lives only in this component's state - nothing is saved
 * to Redux or the backend, so closing/reloading the page starts a fresh conversation.
 */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sendChatMessage, { isLoading }] = useSendChatMessageMutation();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    const historyForRequest = messages;
    const withUserMessage: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(withUserMessage);
    setInput("");

    try {
      const { reply } = await sendChatMessage({ message: text, history: historyForRequest }).unwrap();
      setMessages([...withUserMessage, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...withUserMessage,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    }
  }

  return (
    <div className={styles.wrapper}>
      {isOpen && (
        <div className={styles.window}>
          <div className={styles.header}>
            <span>Assistant</span>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 && (
              <p className={styles.empty}>
                Try asking "what's my schedule today?" or "mark my 3pm done".
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? styles.userMessage : styles.botMessage}
              >
                {m.content}
              </div>
            ))}
            {isLoading && <div className={styles.botMessage}>…</div>}
          </div>

          <form className={styles.inputRow} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              disabled={isLoading}
            />
            <button type="submit" className={styles.sendButton} disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={styles.fab}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close assistant chat" : "Open assistant chat"}
      >
        {isOpen ? "×" : "💬"}
      </button>
    </div>
  );
}
