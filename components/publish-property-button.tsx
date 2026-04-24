"use client";

import { useState } from "react";

type Props = {
  propertyId: string;
  published: boolean;
};

export function PublishPropertyButton({ propertyId, published }: Props) {
  const [isPublished, setIsPublished] = useState(published);
  const [busy, setBusy] = useState(false);

  async function togglePublish() {
    if (!propertyId || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishedToWebsite: !isPublished }),
      });
      if (response.ok) setIsPublished((value) => !value);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={togglePublish} disabled={busy}>
      {busy ? "Saving..." : isPublished ? "Unpublish" : "Publish"}
    </button>
  );
}
