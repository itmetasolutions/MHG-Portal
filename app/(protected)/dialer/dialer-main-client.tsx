"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { createDialerCallHistory, type DialerBootstrapResponse } from "@/lib/portal-api";
import { formatDateTime } from "@/lib/format";

type DialerContactLite = {
  id: string;
  fullName: string;
  phoneNumber: string;
  extensionNumber: string | null;
  email: string | null;
  notes: string | null;
  isFavorite: boolean;
  updatedAt: string;
  labels: Array<{
    id: string;
    name: string;
    colorHex: string;
  }>;
};

type DialerHistoryLite = {
  id: string;
  direction: "INCOMING" | "OUTGOING" | "INTERNAL";
  status: "MISSED" | "RINGING" | "ANSWERED" | "REJECTED" | "COMPLETED" | "FAILED";
  peerName: string | null;
  peerNumber: string | null;
  peerExtension: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
};

type Props = {
  bootstrap: DialerBootstrapResponse;
  contacts: DialerContactLite[];
  recentCalls: DialerHistoryLite[];
};

type IncomingCall = {
  direction: "INCOMING";
  peerName: string | null;
  peerNumber: string | null;
  peerExtension: string | null;
  contactId?: string;
  counterpartUserId?: string | null;
  startedAtMs: number;
};

type LiveCall = {
  direction: "INCOMING" | "OUTGOING" | "INTERNAL";
  peerName: string | null;
  peerNumber: string | null;
  peerExtension: string | null;
  contactId?: string;
  counterpartUserId?: string | null;
  startedAtMs: number;
  answeredAtMs: number | null;
  state: "RINGING" | "ACTIVE";
  isMuted: boolean;
  isOnHold: boolean;
};

function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function callPeerTitle(call: {
  peerName: string | null;
  peerExtension: string | null;
  peerNumber: string | null;
}) {
  return call.peerName || call.peerExtension || call.peerNumber || "Unknown";
}

export function DialerMainClient({ bootstrap, contacts, recentCalls }: Props) {
  const [dialInput, setDialInput] = useState("");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [liveCall, setLiveCall] = useState<LiveCall | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logging, setLogging] = useState(false);
  const [historyPreview, setHistoryPreview] = useState(recentCalls);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canPlaceCalls = useMemo(() => {
    if (!bootstrap.dialerDomain.isEnabled) return false;
    if (!bootstrap.dialerDomain.domain) return false;
    if (!bootstrap.me.dialer.providerUsername) return false;
    if (!bootstrap.me.dialer.providerPassword) return false;
    return true;
  }, [bootstrap]);

  useEffect(() => {
    if (!liveCall) return;
    const handle = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(handle);
  }, [liveCall]);

  useEffect(() => {
    return () => {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, []);

  async function appendHistory(payload: Parameters<typeof createDialerCallHistory>[0]) {
    setLogging(true);
    const result = await createDialerCallHistory(payload);
    setLogging(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Unable to log this call entry." });
      return;
    }
    const call = result.data.call;
    setHistoryPreview((prev) => [
      {
        id: call.id,
        direction: call.direction,
        status: call.status,
        peerName: call.peerName,
        peerNumber: call.peerNumber,
        peerExtension: call.peerExtension,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        durationSec: call.durationSec,
      },
      ...prev,
    ].slice(0, 10));
  }

  function beginOutgoingCall(call: {
    direction: "OUTGOING" | "INTERNAL";
    peerName: string | null;
    peerNumber: string | null;
    peerExtension: string | null;
    contactId?: string;
    counterpartUserId?: string | null;
  }) {
    if (!canPlaceCalls) {
      setMessage({
        type: "error",
        text: "Dialer is not fully configured. Ask admin to set Dialer Domain and extension credentials.",
      });
      return;
    }
    if (liveCall || incomingCall) {
      setMessage({ type: "error", text: "Finish the current call first." });
      return;
    }

    const startedAtMs = Date.now();
    setLiveCall({
      ...call,
      startedAtMs,
      answeredAtMs: null,
      state: "RINGING",
      isMuted: false,
      isOnHold: false,
    });
    setNowMs(Date.now());

    ringTimeoutRef.current = setTimeout(() => {
      setLiveCall((current) => {
        if (!current || current.startedAtMs !== startedAtMs) return current;
        return {
          ...current,
          state: "ACTIVE",
          answeredAtMs: Date.now(),
        };
      });
    }, 1400);
  }

  async function endLiveCall(resultStatus: "COMPLETED" | "FAILED" | "REJECTED") {
    if (!liveCall) return;
    const endedAtMs = Date.now();
    const answeredAtMs = liveCall.answeredAtMs;
    const durationSec = answeredAtMs
      ? Math.max(0, Math.floor((endedAtMs - answeredAtMs) / 1000))
      : 0;

    const payload: Parameters<typeof createDialerCallHistory>[0] = {
      direction: liveCall.direction,
      status: resultStatus,
      contactId: liveCall.contactId,
      counterpartUserId: liveCall.counterpartUserId ?? null,
      peerName: liveCall.peerName,
      peerNumber: liveCall.peerNumber,
      peerExtension: liveCall.peerExtension,
      startedAt: new Date(liveCall.startedAtMs).toISOString(),
      answeredAt: answeredAtMs ? new Date(answeredAtMs).toISOString() : null,
      endedAt: new Date(endedAtMs).toISOString(),
      durationSec,
      notes:
        liveCall.direction === "INTERNAL"
          ? `Internal call with ${callPeerTitle(liveCall)}`
          : null,
    };

    setLiveCall(null);
    await appendHistory(payload);
    setMessage({ type: "success", text: "Call saved to history." });
  }

  async function rejectIncomingCall(asMissed = false) {
    if (!incomingCall) return;
    const endedAtMs = Date.now();
    const status = asMissed ? "MISSED" : "REJECTED";
    const payload: Parameters<typeof createDialerCallHistory>[0] = {
      direction: "INCOMING",
      status,
      contactId: incomingCall.contactId,
      counterpartUserId: incomingCall.counterpartUserId ?? null,
      peerName: incomingCall.peerName,
      peerNumber: incomingCall.peerNumber,
      peerExtension: incomingCall.peerExtension,
      startedAt: new Date(incomingCall.startedAtMs).toISOString(),
      answeredAt: null,
      endedAt: new Date(endedAtMs).toISOString(),
      durationSec: 0,
    };
    setIncomingCall(null);
    await appendHistory(payload);
    setMessage({
      type: "success",
      text: asMissed ? "Incoming call marked as missed." : "Incoming call rejected.",
    });
  }

  function acceptIncomingCall() {
    if (!incomingCall) return;
    const answeredAt = Date.now();
    setLiveCall({
      direction: "INCOMING",
      peerName: incomingCall.peerName,
      peerNumber: incomingCall.peerNumber,
      peerExtension: incomingCall.peerExtension,
      contactId: incomingCall.contactId,
      counterpartUserId: incomingCall.counterpartUserId ?? null,
      startedAtMs: incomingCall.startedAtMs,
      answeredAtMs: answeredAt,
      state: "ACTIVE",
      isMuted: false,
      isOnHold: false,
    });
    setIncomingCall(null);
  }

  function dialFromInput() {
    const target = dialInput.trim();
    if (!target) {
      setMessage({ type: "error", text: "Enter a phone number or extension first." });
      return;
    }

    const matchingContact = contacts.find(
      (contact) => contact.phoneNumber === target || contact.extensionNumber === target,
    );

    beginOutgoingCall({
      direction: "OUTGOING",
      peerName: matchingContact?.fullName ?? null,
      peerNumber: matchingContact ? matchingContact.phoneNumber : target,
      peerExtension: matchingContact?.extensionNumber ?? null,
      contactId: matchingContact?.id,
      counterpartUserId: null,
    });
  }

  function addDigit(value: string) {
    setDialInput((prev) => `${prev}${value}`);
  }

  function simulateIncomingCall() {
    if (incomingCall || liveCall) return;

    if (bootstrap.intercomAgents.length > 0) {
      const random = bootstrap.intercomAgents[Math.floor(Math.random() * bootstrap.intercomAgents.length)];
      setIncomingCall({
        direction: "INCOMING",
        peerName: random.name,
        peerNumber: null,
        peerExtension: random.extensionNumber,
        counterpartUserId: random.id,
        startedAtMs: Date.now(),
      });
      return;
    }

    const contact = contacts[0];
    if (contact) {
      setIncomingCall({
        direction: "INCOMING",
        peerName: contact.fullName,
        peerNumber: contact.phoneNumber,
        peerExtension: contact.extensionNumber,
        contactId: contact.id,
        startedAtMs: Date.now(),
      });
      return;
    }

    setIncomingCall({
      direction: "INCOMING",
      peerName: "Unknown caller",
      peerNumber: "+0000000000",
      peerExtension: null,
      startedAtMs: Date.now(),
    });
  }

  const activeCallDuration = liveCall
    ? formatDuration(
          Math.max(
            0,
          Math.floor((nowMs - (liveCall.answeredAtMs ?? liveCall.startedAtMs)) / 1000),
        ),
      )
    : "00:00";

  return (
    <div className="stack">
      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      <div className="dialer-grid">
        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Connection</h2>
            <span className={`badge ${canPlaceCalls ? "badge-active" : "badge-locked"}`}>
              {canPlaceCalls ? "Ready" : "Setup Required"}
            </span>
          </div>
          <div className="dialer-connection-list">
            <div className="dialer-connection-item">
              <span>Domain</span>
              <strong>{bootstrap.dialerDomain.domain ?? "Not set"}</strong>
            </div>
            <div className="dialer-connection-item">
              <span>WebSocket</span>
              <strong>{bootstrap.dialerDomain.websocketHost ?? "Not set"}</strong>
            </div>
            <div className="dialer-connection-item">
              <span>Extension</span>
              <strong>{bootstrap.me.dialer.extensionNumber ?? "Not assigned"}</strong>
            </div>
            <div className="dialer-connection-item">
              <span>Credential</span>
              <strong>
                {bootstrap.me.dialer.providerUsername
                  ? `${bootstrap.me.dialer.providerUsername}${bootstrap.me.dialer.providerPassword ? " (saved)" : " (missing password)"}`
                  : "Not configured"}
              </strong>
            </div>
          </div>
          <p className="dialer-connection-foot">
            Domain updated:{" "}
            {bootstrap.dialerDomain.updatedAt
              ? formatDateTime(bootstrap.dialerDomain.updatedAt)
              : "Never"}
          </p>
        </section>

        <section className="dialer-card dialer-dialpad-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Keypad</h2>
            <div className="inline-row">
              <UIButton variant="secondary" onClick={simulateIncomingCall} disabled={Boolean(incomingCall || liveCall)}>
                Simulate Incoming
              </UIButton>
            </div>
          </div>
          <div className="dialer-dialer-wrap">
            <UIInput
              value={dialInput}
              onChange={(event) => setDialInput(event.target.value)}
              placeholder="Enter number or extension"
              className="dialer-dial-input"
            />
            <div className="dialer-key-grid">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="dialer-key"
                  onClick={() => addDigit(digit)}
                >
                  {digit}
                </button>
              ))}
            </div>
            <div className="inline-row">
              <UIButton onClick={dialFromInput} disabled={Boolean(liveCall || incomingCall || logging)}>
                Call
              </UIButton>
              <UIButton
                variant="secondary"
                onClick={() => setDialInput((prev) => prev.slice(0, -1))}
                disabled={dialInput.length === 0}
              >
                Backspace
              </UIButton>
              <UIButton variant="secondary" onClick={() => setDialInput("")} disabled={dialInput.length === 0}>
                Clear
              </UIButton>
            </div>
          </div>
        </section>
      </div>

      {incomingCall && (
        <section className="dialer-card dialer-incoming-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Incoming Call</h2>
            <span className="badge badge-warning">Ringing</span>
          </div>
          <div className="dialer-incoming-body">
            <p className="dialer-incoming-title">{callPeerTitle(incomingCall)}</p>
            <p className="dialer-incoming-sub">
              {incomingCall.peerNumber || incomingCall.peerExtension || "Unknown source"}
            </p>
            <div className="inline-row">
              <UIButton onClick={acceptIncomingCall}>Answer</UIButton>
              <UIButton variant="danger" onClick={() => void rejectIncomingCall(false)}>
                Reject
              </UIButton>
              <UIButton variant="secondary" onClick={() => void rejectIncomingCall(true)}>
                Mark Missed
              </UIButton>
            </div>
          </div>
        </section>
      )}

      {liveCall && (
        <section className="dialer-card dialer-live-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">
              {liveCall.direction === "INTERNAL" ? "Internal Call" : "Live Call"} | {callPeerTitle(liveCall)}
            </h2>
            <span className={`badge ${liveCall.state === "ACTIVE" ? "badge-active" : "badge-warning"}`}>
              {liveCall.state === "ACTIVE" ? "In Call" : "Connecting"}
            </span>
          </div>
          <div className="dialer-live-meta">
            <p className="dialer-live-duration">{activeCallDuration}</p>
            <p className="dialer-live-peer">{liveCall.peerNumber || liveCall.peerExtension || "No number"}</p>
          </div>
          <div className="dialer-live-controls">
            <button
              type="button"
              className={`dialer-live-control${liveCall.isMuted ? " active" : ""}`}
              onClick={() =>
                setLiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : prev))
              }
            >
              {liveCall.isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              className={`dialer-live-control${liveCall.isOnHold ? " active" : ""}`}
              onClick={() =>
                setLiveCall((prev) => (prev ? { ...prev, isOnHold: !prev.isOnHold } : prev))
              }
            >
              {liveCall.isOnHold ? "Resume" : "Hold"}
            </button>
            <button
              type="button"
              className="dialer-live-end"
              onClick={() => void endLiveCall("COMPLETED")}
              disabled={logging}
            >
              End Call
            </button>
          </div>
        </section>
      )}

      <div className="dialer-grid">
        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Intercom Agents</h2>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {bootstrap.intercomAgents.length} online
            </span>
          </div>
          {bootstrap.intercomAgents.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No active agent extensions found.
            </p>
          ) : (
            <div className="dialer-agent-list">
              {bootstrap.intercomAgents.map((agent) => (
                <div key={agent.id} className="dialer-agent-item">
                  <div>
                    <p className="dialer-agent-name">{agent.name}</p>
                    <p className="dialer-agent-meta">
                      {agent.extensionNumber ? `Ext ${agent.extensionNumber}` : "No extension"} | {agent.email}
                    </p>
                  </div>
                  <UIButton
                    onClick={() =>
                      beginOutgoingCall({
                        direction: "INTERNAL",
                        peerName: agent.name,
                        peerNumber: null,
                        peerExtension: agent.extensionNumber,
                        counterpartUserId: agent.id,
                      })
                    }
                    disabled={Boolean(liveCall || incomingCall || logging)}
                  >
                    Call
                  </UIButton>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Quick Contacts</h2>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {contacts.length} saved
            </span>
          </div>
          {contacts.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Add contacts from the Contacts tab to speed up dialing.
            </p>
          ) : (
            <div className="dialer-contact-list">
              {contacts.slice(0, 6).map((contact) => (
                <div key={contact.id} className="dialer-contact-item">
                  <div>
                    <p className="dialer-agent-name">{contact.fullName}</p>
                    <p className="dialer-agent-meta">
                      {contact.phoneNumber}
                      {contact.extensionNumber ? ` | Ext ${contact.extensionNumber}` : ""}
                    </p>
                  </div>
                  <UIButton
                    onClick={() =>
                      beginOutgoingCall({
                        direction: "OUTGOING",
                        peerName: contact.fullName,
                        peerNumber: contact.phoneNumber,
                        peerExtension: contact.extensionNumber,
                        contactId: contact.id,
                        counterpartUserId: null,
                      })
                    }
                    disabled={Boolean(liveCall || incomingCall || logging)}
                  >
                    Call
                  </UIButton>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="dialer-card">
        <div className="dialer-card-head">
          <h2 className="dialer-card-title">Recent Activity</h2>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Latest {historyPreview.length} calls</span>
        </div>
        {historyPreview.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No call logs yet.
          </p>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Peer</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {historyPreview.map((call) => (
                  <tr key={call.id}>
                    <td>{call.direction}</td>
                    <td>{call.peerName || call.peerExtension || call.peerNumber || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          call.status === "COMPLETED" || call.status === "ANSWERED"
                            ? "badge-active"
                            : call.status === "MISSED" || call.status === "FAILED" || call.status === "REJECTED"
                              ? "badge-locked"
                              : "badge-warning"
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td>{formatDuration(call.durationSec)}</td>
                    <td>{formatDateTime(call.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
