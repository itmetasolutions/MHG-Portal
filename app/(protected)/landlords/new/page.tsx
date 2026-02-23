"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { checkLandlordNumber, createLandlord } from "@/lib/portal-api";

type NumberCheckState =
  | { checked: false }
  | { checked: true; canCreate: boolean; passiveCount: number; summary?: { id: string; landlordName: string; landlordNumber: string; createdAt: string; ownerAgent: { agentDisplayName: string } } };

export default function NewLandlordPage() {
  const router = useRouter();
  const [landlordName, setLandlordName] = useState("");
  const [landlordNumber, setLandlordNumber] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkState, setCheckState] = useState<NumberCheckState>({ checked: false });

  const normalizedNumber = useMemo(() => landlordNumber.trim(), [landlordNumber]);

  async function runNumberCheck(options?: { silent?: boolean }) {
    if (!normalizedNumber) {
      setCheckState({ checked: false });
      return;
    }

    setChecking(true);
    const checkingNumber = normalizedNumber;
    const result = await checkLandlordNumber(checkingNumber);
    setChecking(false);

    if (checkingNumber !== landlordNumber.trim()) {
      return;
    }

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to validate landlord number." });
      return;
    }

    const nextState: NumberCheckState = {
      checked: true,
      canCreate: result.data.canCreate,
      passiveCount: result.data.passiveCount,
      summary: result.data.existingActiveLandlord
        ? {
            id: result.data.existingActiveLandlord.id,
            landlordName: result.data.existingActiveLandlord.landlordName,
            landlordNumber: result.data.existingActiveLandlord.landlordNumber,
            createdAt: result.data.existingActiveLandlord.createdAt,
            ownerAgent: {
              agentDisplayName: result.data.existingActiveLandlord.ownerAgent.agentDisplayName,
            },
          }
        : undefined,
    };

    setCheckState(nextState);
    if (options?.silent) {
      return;
    }

    if (nextState.canCreate) {
      setMessage({ type: "success", text: "No ACTIVE conflict found. You can proceed." });
    } else {
      setMessage({ type: "error", text: "An ACTIVE landlord already uses this landlordNumber." });
    }
  }

  useEffect(() => {
    if (!normalizedNumber) {
      setCheckState({ checked: false });
      return;
    }

    const timer = setTimeout(() => {
      void runNumberCheck({ silent: true });
    }, 450);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedNumber]);

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    if (!landlordName.trim()) nextErrors.landlordName = "landlordName is required.";
    if (!landlordNumber.trim()) nextErrors.landlordNumber = "landlordNumber is required.";
    if (!propertyId.trim()) nextErrors.propertyId = "propertyId is required.";
    if (!url.trim()) nextErrors.url = "url is required.";
    else {
      try {
        new URL(url.trim());
      } catch {
        nextErrors.url = "url must be valid.";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!validateForm()) return;

    if (!checkState.checked) {
      setMessage({ type: "error", text: "Please run landlordNumber check before creating." });
      return;
    }

    if (checkState.checked && !checkState.canCreate) {
      setMessage({ type: "error", text: "Creation blocked: ACTIVE landlord number conflict." });
      return;
    }

    setCreating(true);
    const result = await createLandlord({
      landlordName: landlordName.trim(),
      landlordNumber: landlordNumber.trim(),
      propertyId: propertyId.trim(),
      url: url.trim(),
    });
    setCreating(false);

    if (!result.ok) {
      if (result.error === "LANDLORD_NUMBER_CONFLICT") {
        setMessage({
          type: "error",
          text: "ACTIVE landlord conflict detected. Please choose another landlordNumber.",
        });
      } else {
        setMessage({ type: "error", text: result.message ?? "Failed to create landlord." });
      }
      return;
    }

    setMessage({ type: "success", text: "Landlord created successfully." });
    router.push(`/landlords/${result.data.landlord.id}`);
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Create Landlord</h1>
          <p className="page-subtitle">Add a new ACTIVE landlord under your ownership.</p>
        </div>
      </header>

      <UICard style={{ maxWidth: 760 }}>
        <UICardBody>
          <form className="field-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span className="label">landlordName</span>
              <UIInput value={landlordName} onChange={(event) => setLandlordName(event.target.value)} />
              {errors.landlordName ? <span className="error-text">{errors.landlordName}</span> : null}
            </label>

            <label className="field">
              <span className="label">landlordNumber</span>
              <div className="inline-row">
                <UIInput
                  style={{ flex: 1 }}
                  value={landlordNumber}
                  onChange={(event) => setLandlordNumber(event.target.value)}
                  onBlur={() => {
                    void runNumberCheck();
                  }}
                />
                <UIButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void runNumberCheck();
                  }}
                  disabled={checking}
                >
                  {checking ? "Checking..." : "Check"}
                </UIButton>
              </div>
              {errors.landlordNumber ? <span className="error-text">{errors.landlordNumber}</span> : null}
            </label>

            {checkState.checked && checkState.summary ? (
              <UIAlert type="error">
                ACTIVE conflict: {checkState.summary.landlordName} ({checkState.summary.landlordNumber}) owned by{" "}
                {checkState.summary.ownerAgent.agentDisplayName}, created {formatDateTime(checkState.summary.createdAt)}.
              </UIAlert>
            ) : null}

            {checkState.checked && !checkState.summary ? (
              <UIAlert type="success">
                No ACTIVE conflict found. PASSIVE history count for this number: {checkState.passiveCount}.
              </UIAlert>
            ) : null}

            <label className="field">
              <span className="label">propertyId</span>
              <UIInput value={propertyId} onChange={(event) => setPropertyId(event.target.value)} />
              {errors.propertyId ? <span className="error-text">{errors.propertyId}</span> : null}
            </label>

            <label className="field">
              <span className="label">url</span>
              <UIInput value={url} onChange={(event) => setUrl(event.target.value)} />
              {errors.url ? <span className="error-text">{errors.url}</span> : null}
            </label>

            {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

            <div className="inline-row">
              <UIButton type="submit" disabled={creating || checking}>
                {creating ? "Creating..." : "Create Landlord"}
              </UIButton>
              <UIButton
                type="button"
                variant="secondary"
                onClick={() => router.push("/landlords")}
                disabled={creating}
              >
                Cancel
              </UIButton>
            </div>
          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
