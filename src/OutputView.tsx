import { useState, useEffect } from 'react'
import { getTask } from './api'

const API_BASE = import.meta.env.VITE_API_URL || 'https://videoprocess.malecon.workers.dev'

interface TaskOutput {
  id: string
  task_id: string
  segment_index: number
  segment_name: string
  r2_key: string
  transcript_text: string | null
  created_at: string
}

interface Props {
  taskId: string
  onBack: () => void
}

export function OutputView({ taskId, onBack }: Props) {
  const [outputs, setOutputs] = useState<TaskOutput[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTask(taskId),
      fetch(`${API_BASE}/tasks/${taskId}/outputs`).then(r => r.json()) as Promise<TaskOutput[]>,
    ]).then(([_t, o]) => {
      setOutputs(o)
    }).finally(() => setLoading(false))
  }, [taskId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-500 flex items-center justify-center">
        Cargando outputs...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm mb-4 cursor-pointer">
          &larr; Home
        </button>

        <h1 className="text-2xl font-bold mb-2">Videos generados</h1>
        <p className="text-gray-500 text-xs font-mono mb-6">Task: {taskId}</p>

        {outputs.length === 0 ? (
          <p className="text-gray-500">No hay outputs aun. El task puede estar procesando.</p>
        ) : (
          <div className="space-y-6">
            {outputs.map((out) => {
              const videoUrl = `${API_BASE}/download/${out.r2_key}`
              return (
                <div key={out.id} className="bg-gray-900 rounded-xl overflow-hidden">
                  {/* Player */}
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-h-[70vh]"
                    preload="metadata"
                  />

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {out.segment_name || `Segmento ${out.segment_index + 1}`}
                      </h3>
                      <a
                        href={videoUrl}
                        download
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm cursor-pointer"
                      >
                        Descargar
                      </a>
                    </div>

                    {out.transcript_text && (
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {out.transcript_text}
                      </p>
                    )}

                    <p className="text-xs text-gray-600 font-mono">{out.r2_key}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
