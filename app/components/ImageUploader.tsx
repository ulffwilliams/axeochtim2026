"use client";

import { useState, useCallback } from "react";

interface UploadedFile {
  id: string;
  name: string;
  link: string;
}

// Måste vara en multipel av 256KB (Googles krav för resumable-chunkar,
// utom sista chunken) och under Vercels gräns för request-payload (4.5MB).
const CHUNK_SIZE = 3 * 1024 * 1024;
const MAX_ATTEMPTS_PER_CHUNK = 3;

async function uploadFileInChunks(
  file: File,
  uploadUrl: string,
): Promise<{ id: string; name: string; webViewLink: string }> {
  const total = file.size;
  let start = 0;
  let result: { id: string; name: string; webViewLink: string } | null = null;

  while (start < total) {
    const end = Math.min(start + CHUNK_SIZE, total) - 1;
    const chunk = file.slice(start, end + 1);
    const contentRange = `bytes ${start}-${end}/${total}`;

    let lastError: Error | null = null;
    let done = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CHUNK && !done; attempt++) {
      try {
        const res = await fetch("/api/upload/chunk", {
          method: "PUT",
          headers: {
            "X-Upload-Url": uploadUrl,
            "X-Content-Range": contentRange,
          },
          body: chunk,
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? "Chunk misslyckades");

        if (data.done) result = data.file;
        done = true;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Chunk misslyckades");
      }
    }

    if (!done) throw lastError ?? new Error("Chunk misslyckades");
    start = end + 1;
  }

  if (!result) throw new Error("Uppladdningen misslyckades");
  return result;
}

export default function ImageUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/"),
    );
    setFiles((prev) => [...prev, ...imageFiles]);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      // Steg 1: be servern starta en resumable-upload-session per bild hos
      // Google (litet JSON-anrop, ingen bilddata i denna request).
      const sessionRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        }),
      });
      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) throw new Error(sessionData.error);

      // Steg 2: ladda upp varje fil i chunkar via vår egen server (Drive API
      // stödjer inte CORS för direkt-PUT från webbläsaren).
      const newlyUploaded: UploadedFile[] = [];
      let uploadError: string | null = null;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const session = sessionData.sessions[i];

        if (!session?.uploadUrl) {
          uploadError = session?.error ?? "Något gick fel";
          continue;
        }

        try {
          const uploaded = await uploadFileInChunks(file, session.uploadUrl);
          newlyUploaded.push({
            id: uploaded.id,
            name: uploaded.name,
            link: uploaded.webViewLink,
          });
        } catch (err) {
          uploadError = err instanceof Error ? err.message : "Något gick fel";
        }
      }

      setUploaded((prev) => [...prev, ...newlyUploaded]);
      setFiles([]);
      if (uploadError) setError(uploadError);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* ---- Loading overlay ---- */}
      {uploading && <LoadingScreen count={files.length} />}

      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-block text-5xl animate-bounce-soft">💌</span>
          <h1
            className="shimmer-text text-5xl sm:text-6xl mt-2"
            style={{ fontFamily: "var(--font-script)" }}
          >
            Axelina &amp; Tim
          </h1>
          <p className="text-pink-400 font-semibold tracking-widest mt-1">
            2026
          </p>
          <p className="mt-4 text-[#9c6b78] leading-relaxed">
            Här får ni gärna ladda upp alla era bilder som ni tagit på
            bröllopet!
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById("file-input")?.click()}
          className={`group border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 shadow-sm
            ${
              dragOver
                ? "border-pink-400 bg-pink-100/70 scale-[1.02] shadow-pink-200 shadow-lg"
                : "border-pink-200 bg-white/60 hover:border-pink-300 hover:bg-pink-50/70 hover:shadow-md"
            }`}
        >
          <span
            className={`inline-block text-4xl transition-transform ${dragOver ? "animate-wiggle" : "group-hover:scale-110"}`}
          >
            📸
          </span>
          <p className="text-[#a86b80] font-semibold mt-3">
            Dra bilder hit eller klicka för att välja
          </p>
          <p className="text-sm text-pink-300 mt-1">JPG, PNG, WebP, GIF</p>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Valda filer */}
        {files.length > 0 && (
          <div className="mt-5 space-y-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="animate-pop-in flex items-center justify-between bg-white/80 backdrop-blur rounded-2xl px-4 py-2.5 shadow-sm border border-pink-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-11 h-11 object-cover rounded-xl ring-2 ring-pink-100"
                  />
                  <span className="text-sm text-[#7a5560] font-medium truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-pink-300 shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="text-pink-300 hover:text-pink-500 hover:scale-125 transition-transform ml-2 text-xl leading-none"
                  aria-label="Ta bort"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full mt-3 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 active:scale-[0.98] disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-pink-200 transition-all"
            >
              {uploading
                ? "Laddar upp..."
                : `Ladda upp ${files.length} bild${files.length > 1 ? "er" : ""}`}
            </button>
          </div>
        )}

        {/* Fel */}
        {error && (
          <p className="animate-pop-in mt-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-center">
            😢 {error}
          </p>
        )}

        {/* Uppladdade filer */}
        {uploaded.length > 0 && (
          <div className="mt-8">
            <p className="text-sm font-bold text-[#a86b80] mb-2 flex items-center gap-1">
              Uppladdade ({uploaded.length})
            </p>
            <div className="space-y-1.5">
              {uploaded.map((f) => (
                <div
                  key={f.id}
                  className="animate-pop-in flex items-center justify-between text-sm bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 rounded-2xl px-4 py-2.5"
                >
                  <span className="text-[#7a5560] font-medium truncate">
                    ✓ {f.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ---- Cute full-screen loading overlay ---- */
function LoadingScreen({ count }: { count: number }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-100/95 to-rose-100/95 backdrop-blur-sm">
      {/* pulsing rings + spinning hearts */}
      <div className="relative flex items-center justify-center w-32 h-32">
        <span className="absolute inset-0 rounded-full bg-pink-300/40 animate-[pulse-ring_1.8s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full bg-pink-300/40 animate-[pulse-ring_1.8s_ease-out_infinite] [animation-delay:0.6s]" />
        <span className="absolute inset-0 rounded-full bg-pink-300/40 animate-[pulse-ring_1.8s_ease-out_infinite] [animation-delay:1.2s]" />
        <span className="text-6xl animate-heart-beat select-none">💖</span>
      </div>

      <p
        className="shimmer-text text-3xl mt-8"
        style={{ fontFamily: "var(--font-script)" }}
      >
        Laddar upp...
      </p>
      <p className="text-[#a86b80] font-medium mt-2">
        {count > 0
          ? `Skickar ${count} bild${count > 1 ? "er" : ""}`
          : "Ett ögonblick!!"}
      </p>

      {/* dancing dots */}
      <div className="flex gap-2 mt-5">
        {["0s", "0.2s", "0.4s"].map((d) => (
          <span
            key={d}
            className="w-3 h-3 rounded-full bg-pink-400 animate-bounce-soft"
            style={{ animationDelay: d }}
          />
        ))}
      </div>
    </div>
  );
}
