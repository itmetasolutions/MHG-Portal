"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";

type AgentNote = {
  id: string;
  title: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function NotesPage() {
  const [notes, setNotes] = useState<AgentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addPinned, setAddPinned] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  const [editNote, setEditNote] = useState<AgentNote | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPinned, setEditPinned] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  async function load() {
    setLoading(true);
    const result = await apiGet<{ notes: AgentNote[] }>("/api/notes");
    setLoading(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load notes." });
      return;
    }
    setNotes(result.data.notes);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (showAdd && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [addContent, showAdd]);

  async function handleAdd() {
    if (!addContent.trim()) {
      setMessage({ type: "error", text: "Note content is required." });
      return;
    }
    setAddBusy(true);
    setMessage(null);
    const result = await apiPost<object, { note: AgentNote }>("/api/notes", {
      title: addTitle.trim() || null,
      content: addContent.trim(),
      isPinned: addPinned,
    });
    setAddBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to save note." });
      return;
    }
    setMessage({ type: "success", text: "Note saved." });
    setShowAdd(false);
    setAddTitle("");
    setAddContent("");
    setAddPinned(false);
    await load();
  }

  function openEdit(note: AgentNote) {
    setEditNote(note);
    setEditTitle(note.title ?? "");
    setEditContent(note.content);
    setEditPinned(note.isPinned);
  }

  async function handleUpdate() {
    if (!editNote) return;
    if (!editContent.trim()) {
      setMessage({ type: "error", text: "Note content is required." });
      return;
    }
    setEditBusy(true);
    setMessage(null);
    const result = await apiPatch<object, { note: AgentNote }>(`/api/notes/${editNote.id}`, {
      title: editTitle.trim() || null,
      content: editContent.trim(),
      isPinned: editPinned,
    });
    setEditBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update note." });
      return;
    }
    setEditNote(null);
    setMessage({ type: "success", text: "Note updated." });
    await load();
  }

  async function togglePin(note: AgentNote) {
    await apiPatch(`/api/notes/${note.id}`, { isPinned: !note.isPinned });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this note?")) return;
    const result = await apiDelete(`/api/notes/${id}`);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to delete." });
      return;
    }
    setMessage({ type: "success", text: "Note deleted." });
    await load();
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter((note) => {
      if (!query) return true;
      return (
        (note.title?.toLowerCase().includes(query) ?? false) ||
        note.content.toLowerCase().includes(query)
      );
    });
  }, [notes, search]);

  const pinned = filtered.filter((note) => note.isPinned);
  const unpinned = filtered.filter((note) => !note.isPinned);

  return (
    <div className="stack">
      <header className="dialer-card dialer-hero-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Personal command notes
            </p>
            <h1 className="page-title">My Notes</h1>
            <p className="page-subtitle">
              Capture call context, reminders, and next steps in a premium note wall with pinned priorities.
            </p>
          </div>
          <UIButton
            onClick={() => {
              setShowAdd((v) => !v);
              setMessage(null);
            }}
          >
            {showAdd ? "Close note" : "+ New Note"}
          </UIButton>
        </div>

        <div className="grid-cards" style={{ marginTop: "1rem" }}>
          <article className="stat-card">
            <p className="stat-label">Total notes</p>
            <p className="stat-value">{notes.length}</p>
            <p className="stat-sub">Private working memory for the team</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Pinned</p>
            <p className="stat-value">{notes.filter((note) => note.isPinned).length}</p>
            <p className="stat-sub">Keep important context in view</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Search results</p>
            <p className="stat-value">{filtered.length}</p>
            <p className="stat-sub">Matching the current query</p>
          </article>
        </div>
      </header>

      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      {showAdd && (
        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">New Note</h2>
            <span className="badge badge-active">Draft</span>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="label">Title (optional)</span>
              <input
                className="input"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="e.g. Landlord follow-up checklist"
                disabled={addBusy}
              />
            </label>

            <label className="field">
              <span className="label">Content</span>
              <textarea
                ref={textareaRef}
                className="input"
                value={addContent}
                onChange={(e) => {
                  setAddContent(e.target.value);
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                placeholder="Write your note here..."
                disabled={addBusy}
                rows={5}
                style={{ resize: "none", overflow: "hidden", fontFamily: "inherit", lineHeight: 1.6 }}
              />
            </label>

            <label className="inline-row" style={{ alignItems: "center" }}>
              <input
                type="checkbox"
                checked={addPinned}
                onChange={(e) => setAddPinned(e.target.checked)}
                disabled={addBusy}
              />
              <span className="label" style={{ margin: 0 }}>
                Pin this note
              </span>
            </label>

            <div className="inline-row">
              <UIButton onClick={() => void handleAdd()} disabled={addBusy}>
                {addBusy ? "Saving..." : "Save Note"}
              </UIButton>
              <UIButton
                variant="secondary"
                onClick={() => {
                  setShowAdd(false);
                  setAddTitle("");
                  setAddContent("");
                  setAddPinned(false);
                }}
              >
                Cancel
              </UIButton>
            </div>
          </div>
        </section>
      )}

      <section className="dialer-card">
        <div className="dialer-card-head">
          <h2 className="dialer-card-title">Library</h2>
          <div className="inline-row">
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              style={{ minWidth: 260 }}
            />
            {search ? (
              <UIButton variant="secondary" onClick={() => setSearch("")}>
                Clear
              </UIButton>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Loading...
          </div>
        ) : notes.length === 0 ? (
          <div className="panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📝</div>
            <p style={{ margin: 0 }}>No notes yet. Click “New Note” to get started.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No notes match your search.
          </div>
        ) : (
          <div className="stack">
            {pinned.length > 0 && (
              <section className="stack" style={{ gap: "0.9rem" }}>
                <div className="inline-row">
                  <span className="section-label" style={{ marginBottom: 0 }}>
                    Pinned
                  </span>
                  <span className="badge badge-warning">{pinned.length}</span>
                </div>
                <div className="property-card-grid">
                  {pinned.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onPin={togglePin}
                    />
                  ))}
                </div>
              </section>
            )}

            {unpinned.length > 0 && (
              <section className="stack" style={{ gap: "0.9rem" }}>
                {pinned.length > 0 && (
                  <div className="inline-row">
                    <span className="section-label" style={{ marginBottom: 0 }}>
                      All Notes
                    </span>
                    <span className="badge badge-active">{unpinned.length}</span>
                  </div>
                )}
                <div className="property-card-grid">
                  {unpinned.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onPin={togglePin}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      {editNote && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>Edit Note</h2>
              <button style={closeBtn} onClick={() => setEditNote(null)}>
                ✕
              </button>
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="label">Title (optional)</span>
                <input
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Note title..."
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span className="label">Content</span>
                <textarea
                  className="input"
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    e.currentTarget.style.height = "auto";
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                  }}
                  disabled={editBusy}
                  rows={6}
                  style={{ resize: "none", overflow: "hidden", fontFamily: "inherit", lineHeight: 1.6 }}
                />
              </label>
              <label className="inline-row" style={{ alignItems: "center" }}>
                <input type="checkbox" checked={editPinned} onChange={(e) => setEditPinned(e.target.checked)} disabled={editBusy} />
                <span className="label" style={{ margin: 0 }}>
                  Pin this note
                </span>
              </label>
              <div className="inline-row">
                <UIButton onClick={() => void handleUpdate()} disabled={editBusy}>
                  {editBusy ? "Saving..." : "Save Changes"}
                </UIButton>
                <UIButton variant="secondary" onClick={() => setEditNote(null)}>
                  Cancel
                </UIButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  expandedId,
  setExpandedId,
  onEdit,
  onDelete,
  onPin,
}: {
  note: AgentNote;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onEdit: (note: AgentNote) => void;
  onDelete: (id: string) => void;
  onPin: (note: AgentNote) => void;
}) {
  const isExpanded = expandedId === note.id;
  const isLong = note.content.length > 160;

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <article className="dialer-card" style={{ gap: "0.7rem" }}>
      <div className="dialer-card-head" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p className="dialer-card-title" style={{ marginBottom: 0.2 }}>
            {note.title || <span style={{ color: "var(--text-muted)", fontWeight: 400, fontStyle: "italic" }}>Untitled</span>}
          </p>
          <p className="dialer-agent-meta" style={{ marginTop: "0.25rem" }}>
            Updated {fmt(note.updatedAt)}
          </p>
        </div>
        <button
          onClick={() => void onPin(note)}
          title={note.isPinned ? "Unpin" : "Pin"}
          className={`badge ${note.isPinned ? "badge-warning" : "badge-locked"}`}
          style={{ cursor: "pointer" }}
        >
          {note.isPinned ? "Pinned" : "Pin"}
        </button>
      </div>

      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.7, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
        {isExpanded || !isLong ? note.content : `${note.content.slice(0, 160)}…`}
      </div>

      {isLong && (
        <button
          onClick={() => setExpandedId(isExpanded ? null : note.id)}
          className="btn btn-secondary btn-sm"
          style={{ alignSelf: "flex-start" }}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}

      <div className="inline-row" style={{ justifyContent: "space-between" }}>
        <div className="inline-row">
          <UIButton variant="secondary" onClick={() => onEdit(note)}>
            Edit
          </UIButton>
          <UIButton variant="danger" onClick={() => onDelete(note.id)}>
            Delete
          </UIButton>
        </div>
      </div>
    </article>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.5rem",
};

const modalStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "1.5rem",
  width: "100%",
  maxWidth: "540px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
  maxHeight: "90vh",
  overflowY: "auto",
};

const closeBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: "1rem",
  padding: "0.25rem",
};