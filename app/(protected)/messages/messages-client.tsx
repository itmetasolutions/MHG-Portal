"use client";

import { useEffect, useRef, useState, FormEvent } from "react";

type Message = {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  fromUserId: string;
  fromUser: { agentDisplayName: string; role: string };
};

type Props = {
  agentId: string;
  adminId: string | null;
  adminName: string;
};

export function AgentMessagesClient({ agentId, adminId, adminName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchMessages() {
    try {
      const res = await fetch("/api/chat/messages");
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchMessages().then(() => setLoading(false));
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || !adminId || sending) return;

    setSending(true);
    const content = messageInput.trim();
    setMessageInput("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: adminId, content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return (
      d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
      " " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    );
  }

  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Direct chat with admin</p>
        </div>
      </header>

      <div className="agent-chat-wrap">
        {/* Chat header */}
        <div className="chat-pane-header">
          <div className="chat-pane-header-info">
            <div className="chat-pane-avatar">{initials}</div>
            <div>
              <div className="chat-pane-name">{adminName}</div>
              <div className="chat-pane-email">Admin · More Homes Group</div>
            </div>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Messages are checked every 3 seconds
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages chat-messages-agent">
          {loading && messages.length === 0 && (
            <p className="chat-loading">Loading messages…</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="chat-no-messages">
              No messages yet.{adminId ? " Send a message to start the conversation!" : " No admin available."}
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.fromUserId === agentId;
            return (
              <div key={msg.id} className={`chat-bubble-row${isMe ? " chat-bubble-row-me" : ""}`}>
                <div className={`chat-bubble${isMe ? " chat-bubble-me" : " chat-bubble-them"}`}>
                  {!isMe && (
                    <span className="chat-bubble-sender">{adminName}</span>
                  )}
                  <p className="chat-bubble-text">{msg.content}</p>
                  <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {adminId ? (
          <form className="chat-input-bar" onSubmit={sendMessage}>
            <input
              className="input chat-input"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Message admin…"
              autoComplete="off"
              disabled={sending}
            />
            <button
              className="btn btn-primary chat-send-btn"
              type="submit"
              disabled={sending || !messageInput.trim()}
            >
              {sending ? "…" : "Send"}
            </button>
          </form>
        ) : (
          <div className="chat-input-bar" style={{ justifyContent: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              No admin available to chat with.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
