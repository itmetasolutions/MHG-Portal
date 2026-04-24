"use client";

import { type ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Contact = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  profilePicture?: string | null;
};

type Message = {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  fromUserId: string;
  fromUser: { agentDisplayName: string; role: string };
};

type ConversationMeta = {
  user: Contact;
  lastMessage: { content: string; createdAt: string; fromUserId: string } | null;
  unreadCount: number;
};

type Props = {
  agentId: string;
  contacts: Contact[];
};

function getInitials(name: string | null | undefined): string {
  return (
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatRelative(dateIso: string | null) {
  if (!dateIso) return "No activity yet";
  const diff = Date.now() - new Date(dateIso).getTime();
  if (diff < 60_000) return "Just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AgentMessagesClient({ agentId, contacts }: Props) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [composerHint, setComposerHint] = useState("Ready to send");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // ignore polling issues
    }
  }

  async function fetchMessages(userId: string) {
    try {
      const res = await fetch(`/api/chat/messages?userId=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // ignore polling issues
    }
  }

  useEffect(() => {
    fetchConversations();
    convPollRef.current = setInterval(fetchConversations, 5000);
    return () => {
      if (convPollRef.current) clearInterval(convPollRef.current);
    };
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedContact) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    fetchMessages(selectedContact.id).then(() => setLoadingMessages(false));

    pollRef.current = setInterval(() => {
      fetchMessages(selectedContact.id);
      fetchConversations();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setComposerHint(messageInput.trim() ? "Typing a reply" : "Ready to send");
  }, [messageInput]);

  const contactsWithMeta: ConversationMeta[] = useMemo(
    () =>
      contacts.map((contact) => {
        const found = conversations.find((conversation) => conversation.user.id === contact.id);
        return found ?? { user: contact, lastMessage: null, unreadCount: 0 };
      }),
    [contacts, conversations],
  );

  const sorted = useMemo(() => {
    return [...contactsWithMeta].sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      if (!a.lastMessage && !b.lastMessage) {
        if (a.user.role === "ADMIN" && b.user.role !== "ADMIN") return -1;
        if (b.user.role === "ADMIN" && a.user.role !== "ADMIN") return 1;
        return 0;
      }
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });
  }, [contactsWithMeta]);

  const filteredContacts = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter(({ user, lastMessage }) => {
      const preview = lastMessage?.content ?? "";
      return (
        (user.name ?? "").toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        preview.toLowerCase().includes(query)
      );
    });
  }, [sidebarQuery, sorted]);

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  const onlineCount = sorted.filter(({ user, lastMessage }) => {
    const reference = lastMessage?.createdAt ?? null;
    if (user.role === "ADMIN") return true;
    if (!reference) return false;
    return Date.now() - new Date(reference).getTime() < 20 * 60 * 1000;
  }).length;

  function isOnline(contact: Contact, lastMessage: ConversationMeta["lastMessage"]) {
    if (contact.role === "ADMIN") return true;
    if (!lastMessage) return false;
    return Date.now() - new Date(lastMessage.createdAt).getTime() < 20 * 60 * 1000;
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setPendingFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageInput.trim() || !selectedContact || sending) return;

    setSending(true);
    const content = messageInput.trim();
    const attachmentNote = pendingFiles.length
      ? `\n\nAttachments: ${pendingFiles.map((file) => file.name).join(", ")}`
      : "";
    setMessageInput("");
    setPendingFiles([]);
    setComposerHint("Sending...");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: selectedContact.id, content: `${content}${attachmentNote}` }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        await fetchConversations();
      }
    } finally {
      setSending(false);
      setComposerHint("Ready to send");
    }
  }

  const currentConversation = selectedContact
    ? conversations.find((conversation) => conversation.user.id === selectedContact.id) ?? null
    : null;

  return (
    <div className="chat-layout chat-workspace">
      <aside className="chat-sidebar chat-thread-list">
        <div className="chat-sidebar-header">
          <h2 className="chat-sidebar-title">
            Messages
            {totalUnread > 0 && <span className="chat-unread-badge">{totalUnread}</span>}
          </h2>
          <p className="chat-sidebar-sub">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} • {onlineCount} online-ready
          </p>
          <label className="field" style={{ marginTop: "0.75rem" }}>
            <span className="label">Search</span>
            <input
              className="input"
              value={sidebarQuery}
              onChange={(e) => setSidebarQuery(e.target.value)}
              placeholder="Search conversations"
            />
          </label>
        </div>

        <div className="chat-agent-list">
          {filteredContacts.length === 0 && <p className="chat-empty-hint">No contacts found.</p>}

          {filteredContacts.map(({ user, lastMessage, unreadCount }) => {
            const active = selectedContact?.id === user.id;
            const online = isOnline(user, lastMessage);
            return (
              <button
                key={user.id}
                className={`chat-agent-item${active ? " chat-agent-item-active" : ""}`}
                onClick={() => setSelectedContact(user)}
              >
                <div className="chat-agent-avatar">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name ?? ""}
                      style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>

                <div className="chat-agent-info">
                  <div className="chat-agent-name">
                    {user.name || "Unknown"}
                    {user.role === "ADMIN" && <span className="chat-role-badge">Admin</span>}
                    <span
                      className="badge"
                      style={{
                        marginLeft: "0.35rem",
                        padding: "0.15rem 0.42rem",
                        background: online ? "rgba(89,210,165,0.14)" : "rgba(255,255,255,0.04)",
                        color: online ? "#59d2a5" : "var(--text-muted)",
                        borderColor: online ? "rgba(89,210,165,0.24)" : "var(--border)",
                      }}
                    >
                      {online ? "Online" : "Idle"}
                    </span>
                    {unreadCount > 0 && <span className="chat-unread-dot">{unreadCount}</span>}
                  </div>

                  {lastMessage ? (
                    <div className="chat-agent-preview">
                      {lastMessage.fromUserId === agentId ? "You: " : ""}
                      {lastMessage.content.length > 40 ? `${lastMessage.content.slice(0, 40)}…` : lastMessage.content}
                    </div>
                  ) : (
                    <div className="chat-agent-preview chat-agent-preview-empty">No messages yet</div>
                  )}
                </div>

                <div className="chat-agent-time">{lastMessage ? formatRelative(lastMessage.createdAt) : "New"}</div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="chat-pane chat-thread-pane">
        {!selectedContact ? (
          <div className="chat-pane-empty">
            <div className="chat-pane-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
            </div>
            <p className="chat-pane-empty-text">Select a contact to start chatting</p>
          </div>
        ) : (
          <>
            <div className="chat-pane-header">
              <div className="chat-pane-header-info">
                <div className="chat-pane-avatar">
                  {selectedContact.profilePicture ? (
                    <img
                      src={selectedContact.profilePicture}
                      alt={selectedContact.name ?? ""}
                      style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    getInitials(selectedContact.name)
                  )}
                </div>

                <div>
                  <div className="chat-pane-name">
                    {selectedContact.name || "Unknown"}
                    {selectedContact.role === "ADMIN" && <span className="chat-role-badge" style={{ marginLeft: "0.5rem" }}>Admin</span>}
                  </div>
                  <div className="chat-pane-email">{selectedContact.email}</div>
                  <div className="chat-pane-email" style={{ marginTop: "0.2rem" }}>
                    {currentConversation?.unreadCount ? `${currentConversation.unreadCount} unread messages` : "Conversation up to date"}
                  </div>
                </div>
              </div>

              <div className="inline-row">
                <span
                  className="badge"
                  style={{
                    background: isOnline(selectedContact, currentConversation?.lastMessage ?? null)
                      ? "rgba(89,210,165,0.14)"
                      : "rgba(255,255,255,0.04)",
                    color: isOnline(selectedContact, currentConversation?.lastMessage ?? null) ? "#59d2a5" : "var(--text-muted)",
                    borderColor: isOnline(selectedContact, currentConversation?.lastMessage ?? null)
                      ? "rgba(89,210,165,0.24)"
                      : "var(--border)",
                  }}
                >
                  {isOnline(selectedContact, currentConversation?.lastMessage ?? null) ? "Online" : "Idle"}
                </span>
                <span className="badge badge-active">{formatRelative(currentConversation?.lastMessage?.createdAt ?? null)}</span>
              </div>
            </div>

            <div className="chat-thread-shell" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", minHeight: 0, flex: 1 }}>
              <div className="chat-messages">
                {loadingMessages && messages.length === 0 && <p className="chat-loading">Loading messages…</p>}
                {!loadingMessages && messages.length === 0 && <p className="chat-no-messages">No messages yet. Start the conversation!</p>}

                {messages.map((msg) => {
                  const isMe = msg.fromUserId === agentId;
                  return (
                    <div key={msg.id} className={`chat-bubble-row${isMe ? " chat-bubble-row-me" : ""}`}>
                      <div className={`chat-bubble${isMe ? " chat-bubble-me" : " chat-bubble-them"}`}>
                        {!isMe && <span className="chat-bubble-sender">{msg.fromUser.agentDisplayName}</span>}
                        <p className="chat-bubble-text">{msg.content}</p>
                        <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <aside className="chat-thread-rail" style={{ borderLeft: "1px solid var(--border)", padding: "1rem", background: "rgba(255,255,255,0.02)" }}>
                <div className="stack" style={{ gap: "0.9rem" }}>
                  <div className="dialer-card" style={{ padding: "0.9rem" }}>
                    <div className="dialer-card-head">
                      <h3 className="dialer-card-title" style={{ fontSize: "0.92rem" }}>Thread details</h3>
                    </div>
                    <p className="dialer-agent-meta" style={{ marginTop: "0.4rem" }}>
                      {selectedContact.role === "ADMIN" ? "Admin contact" : "Agent contact"}
                    </p>
                    <p className="dialer-agent-meta">{selectedContact.email}</p>
                    <p className="dialer-agent-meta">Last seen: {formatRelative(currentConversation?.lastMessage?.createdAt ?? null)}</p>
                  </div>

                  <div className="dialer-card" style={{ padding: "0.9rem" }}>
                    <div className="dialer-card-head">
                      <h3 className="dialer-card-title" style={{ fontSize: "0.92rem" }}>Files</h3>
                    </div>
                    <p className="dialer-agent-meta" style={{ marginTop: "0.4rem" }}>
                      Attach screenshots or documents from the composer.
                    </p>
                    <div className="inline-row">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                        Attach file
                      </button>
                    </div>
                  </div>

                  <div className="dialer-card" style={{ padding: "0.9rem" }}>
                    <div className="dialer-card-head">
                      <h3 className="dialer-card-title" style={{ fontSize: "0.92rem" }}>Typing cue</h3>
                    </div>
                    <p className="dialer-agent-meta" style={{ marginTop: "0.4rem" }}>{composerHint}</p>
                    <p className="dialer-agent-meta">{sending ? "Sending message..." : "Composer ready"}</p>
                  </div>
                </div>
              </aside>
            </div>

            {pendingFiles.length > 0 && (
              <div className="inline-row" style={{ padding: "0 1.25rem 0.25rem", flexWrap: "wrap" }}>
                {pendingFiles.map((file, index) => (
                  <span
                    key={`${file.name}-${index}`}
                    className="badge"
                    style={{
                      background: "rgba(216,182,108,0.12)",
                      color: "var(--brand-gold)",
                      borderColor: "rgba(216,182,108,0.24)",
                      textTransform: "none",
                    }}
                  >
                    {file.name}
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                      style={{
                        marginLeft: "0.4rem",
                        background: "none",
                        border: "none",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <form className="chat-input-bar" onSubmit={sendMessage}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={handleFileSelect}
              />

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Attach a file"
              >
                +
              </button>

              <textarea
                className="input chat-input"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message ${selectedContact.name || "contact"}…`}
                autoComplete="off"
                disabled={sending}
                rows={2}
                style={{ resize: "none", minHeight: 52, paddingTop: "0.8rem", paddingBottom: "0.8rem" }}
              />

              <button className="btn btn-primary chat-send-btn" type="submit" disabled={sending || !messageInput.trim()}>
                {sending ? "…" : "Send"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}