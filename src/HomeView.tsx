import { useState, useEffect } from 'react'
import { listVideos } from './api'
import type { VideoSummary } from './types'

const STREAM_CUSTOMER_CODE = import.meta.env.VITE_STREAM_CUSTOMER_CODE || 'wh3wnchtu0i0y4kd'

interface Props {
  onUpload: () => void
  onSelectVideo: (video: VideoSummary) => void
}

export function HomeView({ onUpload, onSelectVideo }: Props) {
  const [videos, setVideos] = useState<VideoSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listVideos()
      .then(setVideos)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '--'
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    return `${(bytes / 1e6).toFixed(0)} MB`
  }

  const formatDate = (d: string) => {
    return new Date(d + 'Z').toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const statusColor: Record<string, string> = {
    ready: 'text-green-400',
    processing: 'text-blue-400',
    uploading: 'text-yellow-400',
    error: 'text-red-400',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">CiberVidia</h1>
          <button
            onClick={onUpload}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors cursor-pointer"
          >
            + Subir video
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-12">Cargando...</p>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No hay videos aun</p>
            <p className="text-gray-600 text-sm mt-2">Sube tu primer video para empezar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <div
                key={v.id}
                onClick={() => onSelectVideo(v)}
                className="bg-gray-900 rounded-xl overflow-hidden hover:ring-1 hover:ring-gray-700 transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                {v.stream_uid ? (
                  <img
                    src={`https://customer-${STREAM_CUSTOMER_CODE}.cloudflarestream.com/${v.stream_uid}/thumbnails/thumbnail.jpg?time=10s&width=400`}
                    alt=""
                    className="w-full aspect-video object-cover bg-gray-800"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gray-800 flex items-center justify-center text-gray-600 text-sm">
                    Sin preview
                  </div>
                )}

                {/* Info */}
                <div className="p-3 space-y-1">
                  <p className="text-xs font-mono text-gray-500 truncate">{v.id}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className={statusColor[v.status] || 'text-gray-400'}>{v.status}</span>
                    <span className="text-gray-600">{formatSize(v.file_size)}</span>
                  </div>
                  {v.transcript_text && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{v.transcript_text.slice(0, 120)}...</p>
                  )}
                  <p className="text-xs text-gray-600">{formatDate(v.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
