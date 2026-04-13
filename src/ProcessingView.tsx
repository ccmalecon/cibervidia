import { useState, useEffect, useCallback } from 'react'
import { getJobStatus, startTranscription, getTranscript } from './api'
import type { JobStatus } from './types'

interface Props {
  jobId: string
  onReady: (job: JobStatus) => void
}

const STATUS_LABELS: Record<string, string> = {
  uploading: 'Subiendo video...',
  processing: 'Extrayendo audio y subiendo a Stream...',
  transcribing: 'Transcribiendo con Whisper...',
  analyzing: 'Analizando bloques tematicos con IA...',
  ready: 'Listo!',
  error: 'Error',
}

export function ProcessingView({ jobId, onReady }: Props) {
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [transcriptionStarted, setTranscriptionStarted] = useState(false)

  const poll = useCallback(async () => {
    try {
      const job = await getJobStatus(jobId)
      setStatus(job)

      // When audio extraction is done, start transcription
      if (job.status === 'done' && !transcriptionStarted) {
        setTranscriptionStarted(true)
        await startTranscription(jobId)
        return
      }

      // When transcription started, poll the transcript endpoint
      if (transcriptionStarted && job.status !== 'error') {
        const transcript = await getTranscript(jobId)
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
  const steps = ['processing', 'transcribing', 'analyzing', 'ready']
  const currentIdx = steps.indexOf(step === 'done' ? 'transcribing' : step)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-2xl font-bold">Procesando video</h1>

        {/* Steps */}
        <div className="space-y-4 text-left">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                i < currentIdx ? 'bg-green-600' :
                i === currentIdx ? 'bg-blue-600 animate-pulse' :
                'bg-gray-800'
              }`}>
                {i < currentIdx ? '\u2713' : i + 1}
              </div>
              <span className={`text-sm ${i <= currentIdx ? 'text-gray-100' : 'text-gray-600'}`}>
                {STATUS_LABELS[s] || s}
              </span>
            </div>
          ))}
        </div>

        {/* Error */}
        {status?.status === 'error' && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-sm">{status.error || 'Error desconocido'}</p>
          </div>
        )}

        <p className="text-gray-600 text-xs">Esto puede tardar unos minutos dependiendo de la duracion del video</p>
      </div>
    </div>
  )
}
