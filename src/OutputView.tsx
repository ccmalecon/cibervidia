import { useState, useEffect } from 'react'
import { getTask } from './api'

const API_BASE = import.meta.env.VITE_API_URL || 'https://videoprocess.malecon.workers.dev'
const CIBERIA_API = 'https://ciberia-article-worker.malecon.workers.dev/ciberia/api/tasks?key=kalimantan'

interface TaskOutput {
  id: string
  task_id: string
  segment_index: number
  segment_name: string
  r2_key: string
  transcript_text: string | null
  title: string | null
  social_text: string | null
  connatix_id: string | null
  ciberia_sent: boolean
  created_at: string
}

interface Props {
  taskId: string
  onBack: () => void
}

export function OutputView({ taskId, onBack }: Props) {
  const [outputs, setOutputs] = useState<TaskOutput[]>([])
  const [fullTranscript, setFullTranscript] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTask(taskId),
      fetch(`${API_BASE}/tasks/${taskId}/outputs`).then(r => r.json()) as Promise<TaskOutput[]>,
    ]).then(async ([t, o]) => {
      setOutputs(o.map(out => ({ ...out, ciberia_sent: false })))
      // Fetch full transcript for context
      try {
        const videoResp = await fetch(`${API_BASE}/videos/${t.video_id}`)
        const video = await videoResp.json() as { transcript_text?: string }
        setFullTranscript(video.transcript_text || '')
      } catch {}
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
            {outputs.map((out, idx) => (
              <OutputCard
                key={out.id}
                output={out}
                taskId={taskId}
                fullTranscript={fullTranscript}
                onUpdate={(updated) => setOutputs(prev => prev.map((o, i) => i === idx ? updated : o))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OutputCard({ output: initialOutput, taskId, fullTranscript, onUpdate }: {
  output: TaskOutput
  taskId: string
  fullTranscript: string
  onUpdate: (output: TaskOutput) => void
}) {
  const [output, setOutput] = useState(initialOutput)
  const [sending, setSending] = useState(false)
  const [sendingCiberia, setSendingCiberia] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoUrl = `${API_BASE}/download/${output.r2_key}`

  const sendToConnatix = async () => {
    setSending(true)
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/tasks/${taskId}/outputs/${output.id}/connatix`, {
        method: 'POST',
      })
      const data = await resp.json() as { connatixId?: string; error?: string }
      if (data.connatixId) {
        const updated = { ...output, connatix_id: data.connatixId }
        setOutput(updated)
        onUpdate(updated)
      } else {
        setError(data.error || 'Failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSending(false)
    }
  }

  const sendToCiberia = async () => {
    if (!output.connatix_id) {
      setError('Primero envía a Connatix')
      return
    }
    setSendingCiberia(true)
    setError(null)
    try {
      const body = {
        title: output.title || output.segment_name || 'Video CiberCuba',
        sources: [
          { type: 'text', value: output.transcript_text || '' },
        ],
        context_urls: [
          { type: 'text', value: fullTranscript.slice(0, 5000) },
        ],
        flow: 'actualidad',
        speed: 'rapido',
        urgent: 0,
        editorial_notes: 'Artículo basado en segmento de video. Usar el texto como fuente principal y el contexto para dar profundidad.',
        connatix: 1,
        connatix_id: output.connatix_id,
        auto_asignado: false,
      }

      const resp = await fetch(CIBERIA_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(`CiberIA: ${resp.status} ${err}`)
      }

      const updated = { ...output, ciberia_sent: true }
      setOutput(updated)
      onUpdate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSendingCiberia(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <video src={videoUrl} controls className="w-full max-h-[70vh]" preload="metadata" />

      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg">
          {output.title || output.segment_name || `Segmento ${output.segment_index + 1}`}
        </h3>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {output.connatix_id ? (
            <span className="px-3 py-1.5 bg-green-900/50 text-green-400 rounded text-xs font-mono break-all">
              Connatix: {output.connatix_id}
            </span>
          ) : (
            <button
              onClick={sendToConnatix}
              disabled={sending}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded text-sm cursor-pointer"
            >
              {sending ? 'Enviando...' : 'Connatix'}
            </button>
          )}

          {output.connatix_id && !output.ciberia_sent && (
            <button
              onClick={sendToCiberia}
              disabled={sendingCiberia}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-sm cursor-pointer"
            >
              {sendingCiberia ? 'Enviando...' : 'CiberIA'}
            </button>
          )}

          {output.ciberia_sent && (
            <span className="px-3 py-1.5 bg-purple-900/50 text-purple-400 rounded text-xs">
              CiberIA enviado
            </span>
          )}

          <a
            href={videoUrl}
            download
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm cursor-pointer"
          >
            Descargar
          </a>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {output.social_text && (
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-500 font-semibold uppercase">Texto para redes</p>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{output.social_text}</p>
            <button
              onClick={() => navigator.clipboard.writeText(output.social_text || '')}
              className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              Copiar texto
            </button>
          </div>
        )}

        {output.transcript_text && (
          <details className="text-sm">
            <summary className="text-gray-500 cursor-pointer text-xs">Transcript</summary>
            <p className="text-gray-400 leading-relaxed mt-2">{output.transcript_text}</p>
          </details>
        )}

        <p className="text-xs text-gray-600 font-mono">{output.r2_key}</p>
      </div>
    </div>
  )
}
