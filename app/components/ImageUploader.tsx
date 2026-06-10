"use client";

import { useState, useCallback } from "react";

interface UploadedFile {
  id: string;
  name: string;
  link: string;
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

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setUploaded((prev) => [...prev, ...data.files]);
      setFiles([]);
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
