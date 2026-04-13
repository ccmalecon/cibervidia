import { useState, useRef } from 'react'
import { initUpload, uploadFileToR2, completeUpload } from './api'

interface Props {
  onJobStarted: (jobId: string) => void
}

export function UploadView({ onJobStarted }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [instructions, setInstructions] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) setFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      // 1. Get presigned URL
      const { id, uploadUrl } = await initUpload()

      // 2. Upload to R2
      await uploadFileToR2(uploadUrl, file, setProgress)

      // 3. Complete — triggers Stream + audio extraction in parallel
      await completeUpload(id, instructions || undefined)

      onJobStarted(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    return `${(bytes / 1e6).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-center">CiberVidia</h1>
        <p className="text-gray-400 text-center text-sm">
          Sube un video para transcribir, analizar y segmentar
        </p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            file ? 'border-green-500 bg-green-500/5' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setFile(f)
            }}
          />
          {file ? (
            <div className="space-y-1">
              <p className="text-green-400 font-medium">{file.name}</p>
              <p className="text-gray-500 text-sm">{formatSize(file.size)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-400">Arrastra un video aqui o haz click para seleccionar</p>
              <p className="text-gray-600 text-xs">MP4, MOV, WebM</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Instrucciones editoriales (opcional)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ej: Este es un podcast sobre Cuba. Divide por tema noticioso. Identifica los momentos mas polemicos para clips de redes sociales."
            rows={3}
            className="w-full bg-gray-900 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 text-center">
              {progress < 100 ? `Subiendo... ${progress}%` : 'Procesando...'}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!file || uploading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium transition-colors cursor-pointer"
        >
          {uploading ? 'Procesando...' : 'Subir y procesar'}
        </button>
      </div>
    </div>
  )
}
