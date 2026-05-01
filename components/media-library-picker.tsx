"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { listMediaLibrary, uploadMediaAssets, type MediaAssetRow } from "@/lib/portal-api";

export type MediaSelectionValue = {
  mediaAssetId: string;
  altText: string;
};

type Props = {
  selectedAssets: MediaSelectionValue[];
  onChange: (assets: MediaSelectionValue[]) => void;
  disabled?: boolean;
  label?: string;
};

const MAX_UPLOAD_FILES = 10;
const MAX_FILE_SIZE_BYTES = 8_000_000;
const MAX_IMAGE_DIMENSION = 1600;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = dataUrl;
  });
}

async function optimizeImageFile(file: File): Promise<{ name: string; dataUrl: string }> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to prepare image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return { name: file.name, dataUrl: canvas.toDataURL("image/jpeg", 0.82) };
}

export function MediaLibraryPicker({
  selectedAssets,
  onChange,
  disabled = false,
  label = "Property Photos",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAssetIds = useMemo(
    () => new Set(selectedAssets.map((a) => a.mediaAssetId)),
    [selectedAssets],
  );

  const loadAssets = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    const result = await listMediaLibrary();
    setLoading(false);
    setLoaded(true);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load media library." });
      return;
    }
    setAssets(result.data.assets);
  }, [loaded]);

  useEffect(() => {
    if (isOpen) void loadAssets();
  }, [isOpen, loadAssets]);

  const sortedAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...assets]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((a) => !q || a.name.toLowerCase().includes(q));
  }, [assets, search]);

  const selectedRows = useMemo(() => {
    return selectedAssets
      .map((sel) => {
        const asset = assets.find((a) => a.id === sel.mediaAssetId);
        if (!asset) return null;
        return { asset, sel };
      })
      .filter(Boolean) as Array<{ asset: MediaAssetRow; sel: MediaSelectionValue }>;
  }, [assets, selectedAssets]);

  function toggleAsset(assetId: string) {
    if (disabled) return;
    if (selectedAssetIds.has(assetId)) {
      onChange(selectedAssets.filter((a) => a.mediaAssetId !== assetId));
    } else {
      const asset = assets.find((a) => a.id === assetId);
      onChange([
        ...selectedAssets,
        { mediaAssetId: assetId, altText: asset?.name?.trim() || "Property photo" },
      ]);
    }
  }

  function updateAltText(mediaAssetId: string, altText: string) {
    onChange(selectedAssets.map((a) => (a.mediaAssetId === mediaAssetId ? { ...a, altText } : a)));
  }

  function removeAsset(mediaAssetId: string) {
    onChange(selectedAssets.filter((a) => a.mediaAssetId !== mediaAssetId));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (files.length > MAX_UPLOAD_FILES) {
      setMessage({ type: "error", text: `Upload up to ${MAX_UPLOAD_FILES} images at a time.` });
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setMessage({ type: "error", text: "Only image files can be uploaded." });
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setMessage({ type: "error", text: "Each file must be smaller than 8 MB." });
        return;
      }
    }

    try {
      setUploading(true);
      setMessage(null);
      const optimized = await Promise.all(files.map(optimizeImageFile));
      const result = await uploadMediaAssets({ files: optimized });
      setUploading(false);

      if (!result.ok) {
        setMessage({ type: "error", text: result.message ?? "Failed to upload images." });
        return;
      }

      const uploaded = result.data.assets;
      setAssets((prev) => {
        const map = new Map(prev.map((a) => [a.id, a]));
        for (const a of uploaded) map.set(a.id, a);
        return Array.from(map.values());
      });

      const toAdd = uploaded
        .filter((a) => !selectedAssetIds.has(a.id))
        .map<MediaSelectionValue>((a) => ({
          mediaAssetId: a.id,
          altText: a.name?.trim() || "Property photo",
        }));

      onChange([...selectedAssets, ...toAdd]);
      setMessage({
        type: "success",
        text: uploaded.length === 1 ? "Image uploaded and selected." : "Images uploaded and selected.",
      });
    } catch (err) {
      setUploading(false);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to prepare images.",
      });
    }
  }

  return (
    <>
      {/* ── Trigger + outside-modal selected list ── */}
      <div className="stack" style={{ gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "var(--text)" }}>{label}</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Open the media library to select or upload photos. Add alt text for each selected photo.
            </p>
          </div>
          <UIButton
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
          >
            {selectedAssets.length > 0
              ? `Media Library (${selectedAssets.length} selected)`
              : "Open Media Library"}
          </UIButton>
        </div>

        {/* Selected images outside modal with alt text */}
        {selectedRows.length > 0 && (
          <div className="stack" style={{ gap: "0.6rem" }}>
            {selectedRows.map(({ asset, sel }) => (
              <div
                key={asset.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "88px 1fr auto",
                  gap: "0.75rem",
                  alignItems: "start",
                  border: "1px solid var(--border)",
                  borderRadius: "0.65rem",
                  padding: "0.65rem",
                  background: "var(--surface-alt, #1a1a24)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.dataUrl}
                  alt={sel.altText || asset.name}
                  style={{
                    width: 88,
                    height: 66,
                    objectFit: "cover",
                    borderRadius: "0.45rem",
                    background: "#101016",
                  }}
                />
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label" style={{ fontSize: "0.76rem" }}>
                    Alt text
                  </span>
                  <UIInput
                    value={sel.altText}
                    onChange={(e) => updateAltText(asset.id, e.target.value)}
                    placeholder="Describe this photo"
                    disabled={disabled}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {asset.name}
                  </span>
                </label>
                <UIButton
                  type="button"
                  variant="secondary"
                  onClick={() => removeAsset(asset.id)}
                  disabled={disabled}
                  style={{ marginTop: "1.4rem" }}
                >
                  Remove
                </UIButton>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {isOpen && (
        <div
          className="modal-backdrop"
          style={{ alignItems: "flex-start", paddingTop: "2vh" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              width: "min(1040px, 96vw)",
              height: "90vh",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "0.9rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", flex: 1 }}>
                Media Library
              </span>
              <UIInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search images..."
                style={{ maxWidth: 220 }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <UIButton
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Photos"}
              </UIButton>
              <UIButton type="button" onClick={() => setIsOpen(false)}>
                Done
              </UIButton>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Modal body — image grid */}
            <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
              {message && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <UIAlert type={message.type}>{message.text}</UIAlert>
                </div>
              )}

              {loading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading media library...
                </div>
              ) : sortedAssets.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed var(--border)",
                    borderRadius: "0.75rem",
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  {search ? "No images match your search." : "No photos uploaded yet. Use the Upload Photos button to add images."}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  {sortedAssets.map((asset) => {
                    const isSelected = selectedAssetIds.has(asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleAsset(asset.id)}
                        style={{
                          position: "relative",
                          border: isSelected
                            ? "2px solid var(--brand-gold)"
                            : "1px solid var(--border)",
                          borderRadius: "0.7rem",
                          padding: "0.45rem",
                          background: isSelected
                            ? "rgba(201,168,76,0.10)"
                            : "var(--surface-alt, #1a1a24)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.dataUrl}
                          alt={asset.name}
                          style={{
                            width: "100%",
                            aspectRatio: "4/3",
                            objectFit: "cover",
                            borderRadius: "0.5rem",
                            background: "#101016",
                            display: "block",
                          }}
                        />
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {asset.name}
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "var(--brand-gold)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 20 20"
                              fill="#151515"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal footer — selected with alt text */}
            {selectedAssets.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  maxHeight: "35vh",
                  overflow: "auto",
                  padding: "0.85rem 1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  {selectedAssets.length} photo{selectedAssets.length !== 1 ? "s" : ""} selected — add alt text below
                </p>
                {selectedRows.map(({ asset, sel }) => (
                  <div
                    key={asset.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "56px 1fr auto",
                      gap: "0.65rem",
                      alignItems: "center",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.dataUrl}
                      alt={sel.altText || asset.name}
                      style={{
                        width: 56,
                        height: 42,
                        objectFit: "cover",
                        borderRadius: "0.35rem",
                        border: "1px solid var(--border)",
                      }}
                    />
                    <UIInput
                      value={sel.altText}
                      onChange={(e) => updateAltText(asset.id, e.target.value)}
                      placeholder={`Alt text for "${asset.name}"`}
                    />
                    <button
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                      aria-label="Remove"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: "0.2rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
