'use client'

import { useState, useCallback } from 'react'

interface UploadedFile {
  id: string
  name: string
  link: string
}

export default function ImageUploader() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<UploadedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...imageFiles])
    setError(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setError(null)

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setUploaded(prev => [...prev, ...data.files])
      setFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Ladda upp bilder</h1>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <p className="text-gray-500">Dra bilder hit eller klicka för att välja</p>
        <p className="text-sm text-gray-400 mt-1">JPG, PNG, WebP, GIF</p>
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Valda filer */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
              <div className="flex items-center gap-3">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded"
                />
                <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
              </div>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 ml-2">×</button>
            </div>
          ))}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {uploading ? 'Laddar upp...' : `Ladda upp ${files.length} bild${files.length > 1 ? 'er' : ''}`}
          </button>
        </div>
      )}

      {/* Fel */}
      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* Uppladdade filer */}
      {uploaded.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Uppladdade ({uploaded.length})</p>
          <div className="space-y-1">
            {uploaded.map(f => (
              <div key={f.id} className="flex items-center justify-between text-sm bg-green-50 rounded-lg px-4 py-2">
                <span className="text-gray-700 truncate">{f.name}</span>
                <a href={f.link} target="_blank" rel="noopener" className="text-blue-600 hover:underline shrink-0 ml-3">
                  Visa i Drive →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
