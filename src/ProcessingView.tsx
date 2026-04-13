import { useState, useEffect, useCallback } from 'react'
import { getJobStatus, startTranscription, getTranscript, retryProcessing } from './api'
import type { JobStatus, LogEntry } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'https://videoprocess.malecon.workers.dev'

interface Props {
  jobId: string
  onReady: (job: JobStatus) => void
}

const STEP_LABELS: Record<string, string> = {
  init: 'Inicializacion',
  complete: 'Upload completo',
  stream: 'Cloudflare Stream',
  ffmpeg: 'FFmpeg container',
  transcribe: 'Transcripcion',
  whisper: 'Whisper API',
  claude: 'Claude API',
  'transcribe-error': 'Error',
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-gray-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
}

export function ProcessingView({ jobId, onReady }: Props) {
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [containerLogs, setContainerLogs] = useState<string[]>([])
  const [transcriptionStarted, setTranscriptionStarted] = useState(false)

  const poll = useCallback(async () => {
    try {
      const job = await getJobStatus(jobId)
      setStatus(job)
      if (job.logs) setLogs(job.logs)

      // Fetch container logs when processing
      if (job.status === 'processing' || job.status === 'done') {
        try {
          const resp = await fetch(`${API_BASE}/logs/${jobId}`)
          if (resp.ok) {
            const text = await resp.text()
            const lines = text.split('\n').filter(Boolean).slice(-15)
            setContainerLogs(lines)
          }
        } catch {}
      }

      // When audio extraction is done, start transcription
      if (job.status === 'done' && !transcriptionStarted) {
        setTranscriptionStarted(true)
        await startTranscription(jobId)
        return
      }

      // Poll transcript endpoint when transcription is active
      if (transcriptionStarted && job.status !== 'error') {
        const transcript = await getTranscript(jobId)
        if (transcript.logs) setLogs(transcript.logs as LogEntry[])
        if (transcript.status === 'ready') {
          onReady({
            ...job,
            status: 'ready',
            streamUid: transcript.streamUid,
            transcript: transcript.transcript,
            blocks: transcript.blocks,
          })
          return
        }
        setStatus((prev) => prev ? { ...prev, status: transcript.status as JobStatus['status'] } : prev)
      }
    } catch {
      // Retry on network errors
    }
  }, [jobId, transcriptionStarted, onReady])

  useEffect(() => {
    const interval = setInterval(poll, 3000)
    poll()
    return () => clearInterval(interval)
  }, [poll])

  const step = status?.status || 'processing'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Procesando video</h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">Job: {jobId}</p>
          <p className="text-sm mt-2">
            Estado: <span className={`font-bold ${step === 'error' ? 'text-red-400' : 'text-blue-400'}`}>{step}</span>
          </p>
        </div>

        {/* Error banner + retry */}
        {status?.error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 space-y-3">
            <p className="text-red-400 text-sm font-mono break-all">{status.error}</p>
            <button
              onClick={async () => {
                await retryProcessing(jobId)
                poll()
              }}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Retry button for stuck processing (no updates for a while) */}
        {step === 'processing' && !status?.error && logs.length > 0 && (
          <div className="text-center">
            <button
              onClick={async () => {
                await retryProcessing(jobId)
                poll()
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs cursor-pointer text-gray-400"
            >
              Reintentar extraccion de audio
            </button>
          </div>
        )}

        {/* Live logs */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium">Logs ({logs.length})</span>
            <span className="text-xs text-gray-500 font-mono">auto-refresh 3s</span>
          </div>
          <div className="max-h-96 overflow-y-auto p-3 space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-600">Esperando logs...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${LEVEL_COLORS[log.level] || 'text-gray-400'}`}>
                  <span className="text-gray-600 shrink-0">
                    {new Date(log.ts).toLocaleTimeString()}
                  </span>
                  <span className={`shrink-0 px-1 rounded ${
                    log.level === 'error' ? 'bg-red-900/50' :
                    log.level === 'warn' ? 'bg-yellow-900/50' :
                    'bg-gray-800'
                  }`}>
                    {STEP_LABELS[log.step] || log.step}
                  </span>
                  <span className="break-all">{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Container logs */}
        {containerLogs.length > 0 && (
          <details className="bg-gray-900 rounded-lg overflow-hidden mt-4">
            <summary className="px-4 py-2 bg-gray-800 border-b border-gray-700 text-sm font-medium cursor-pointer">
              Container ({containerLogs.length} lineas)
            </summary>
            <div className="max-h-48 overflow-y-auto p-3 space-y-0.5 font-mono text-xs text-gray-500">
              {containerLogs.map((line, i) => (
                <div key={i} className={line.includes('ERROR') ? 'text-red-400' : ''}>{line}</div>
              ))}
            </div>
          </details>
        )}

        <p className="text-gray-600 text-xs text-center mt-4">
          Esto puede tardar unos minutos dependiendo de la duracion del video
        </p>
      </div>
    </div>
  )
}
