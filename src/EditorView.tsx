import { useRef, useState, useCallback } from 'react'
import { Stream } from '@cloudflare/stream-react'
import type { StreamPlayerApi } from '@cloudflare/stream-react'
import type { JobStatus, Segment, TranscriptWord } from './types'
import { formatTime } from './utils'
import { Timeline } from './Timeline'
import { SegmentList } from './SegmentList'
import { TranscriptPanel } from './TranscriptPanel'
import { createTask, startTaskProcessing } from './api'

const STREAM_CUSTOMER_CODE = import.meta.env.VITE_STREAM_CUSTOMER_CODE || 'wh3wnchtu0i0y4kd'

interface Props {
  job: JobStatus
  onTaskCreated: (taskId: string) => void
  onBack: () => void
}

export function EditorView({ job, onTaskCreated, onBack }: Props) {
  const streamRef = useRef<StreamPlayerApi>(undefined)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [segments, setSegments] = useState<Segment[]>([])
  const [lockedSegmentId, setLockedSegmentId] = useState<string | null>(null)
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null)

  const blocks = job.blocks || []
  const words = job.transcript?.words || []

  const lockedSegment = segments.find((s) => s.id === lockedSegmentId)

  const handleTimeUpdate = useCallback(() => {
    if (!streamRef.current) return
    const t = streamRef.current.currentTime
    setCurrentTime(t)
    if (lockedSegment && lockedSegment.inTime !== null && lockedSegment.outTime !== null) {
      if (t >= lockedSegment.outTime) {
        streamRef.current.currentTime = lockedSegment.inTime
      } else if (t < lockedSegment.inTime - 0.5) {
        streamRef.current.currentTime = lockedSegment.inTime
      }
    }
  }, [lockedSegment])

  const seekTo = useCallback((time: number) => {
    if (streamRef.current) {
      streamRef.current.currentTime = time
      streamRef.current.pause()
    }
  }, [])

  const playFrom = useCallback((time: number) => {
    if (streamRef.current) {
      streamRef.current.currentTime = time
      streamRef.current.play()
    }
  }, [])

  const createSegment = (name: string, inTime: number, outTime: number) => {
    setSegments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        inTime,
        outTime,
      },
    ])
  }

  const updateSegment = (id: string, updates: Partial<Segment>) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id))
    if (lockedSegmentId === id) setLockedSegmentId(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="flex h-screen">
        {/* Back button overlay */}
        <button
          onClick={onBack}
          className="absolute top-3 right-4 z-10 text-gray-500 hover:text-gray-300 text-sm cursor-pointer bg-gray-900/80 px-3 py-1 rounded"
        >
          &larr; Home
        </button>

        {/* Left panel: Transcript */}
        <TranscriptPanel
          blocks={blocks}
          words={words}
          segments={segments}
          highlightedSegmentId={highlightedSegmentId}
          currentTime={currentTime}
          onPlay={playFrom}
          onSeek={seekTo}
          onCreateSegment={createSegment}
        />

        {/* Right panel: Video + segments */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Player — compact */}
          <div className="bg-gray-900 p-3">
            <div className="max-w-lg mx-auto">
              {job.streamUid ? (
                <Stream
                  src={job.streamUid}
                  customerCode={STREAM_CUSTOMER_CODE}
                  streamRef={streamRef}
                  controls
                  responsive
                  onTimeUpdate={handleTimeUpdate}
                  onDurationChange={() => {
                    if (streamRef.current) setDuration(streamRef.current.duration)
                  }}
                />
              ) : (
                <div className="aspect-video bg-gray-800 rounded flex items-center justify-center text-gray-500">
                  Video no disponible en Stream aun
                </div>
              )}
            </div>
            {/* Karaoke words under video */}
            <div className="max-w-lg mx-auto mt-2 min-h-[2rem] flex items-center justify-center">
              <KaraokeBar words={words} currentTime={currentTime} onWordClick={seekTo} />
            </div>
            <div className="max-w-lg mx-auto mt-1 text-xs text-gray-500 font-mono text-center">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Timeline */}
          {duration > 0 && (
            <div className="px-4 pt-3">
              <Timeline
                duration={duration}
                currentTime={currentTime}
                segments={segments}
                onSeek={seekTo}
              />
            </div>
          )}

          {/* Segments */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <SegmentList
              segments={segments}
              videoUid={job.streamUid || ''}
              customerCode={STREAM_CUSTOMER_CODE}
              duration={duration}
              lockedSegmentId={lockedSegmentId}
              highlightedSegmentId={highlightedSegmentId}
              onLock={setLockedSegmentId}
              onHighlight={setHighlightedSegmentId}
              onUpdate={updateSegment}
              onRemove={removeSegment}
              onSeek={seekTo}
            />

            {/* Export as task */}
            {segments.length > 0 && (
              <ExportButton segments={segments} videoId={job.id} onTaskCreated={onTaskCreated} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KaraokeBar({
  words,
  currentTime,
  onWordClick,
}: {
  words: TranscriptWord[]
  currentTime: number
  onWordClick: (time: number) => void
}) {
  if (words.length === 0) return null

  // Find current word index
  const currentIdx = words.findIndex((w) => w.start <= currentTime && w.end >= currentTime)
  // Show a window of words around current position
  const center = currentIdx >= 0 ? currentIdx : words.findIndex((w) => w.start > currentTime) - 1
  const start = Math.max(0, center - 6)
  const end = Math.min(words.length, start + 14)
  const visible = words.slice(start, end)

  return (
    <p className="text-sm text-center leading-relaxed">
      {visible.map((w, i) => {
        const idx = start + i
        const isActive = currentTime >= w.start && currentTime <= w.end
        const isPast = currentTime > w.end
        return (
          <span
            key={idx}
            onClick={() => onWordClick(w.start)}
            className={`cursor-pointer transition-colors ${
              isActive ? 'text-blue-300 font-bold' :
              isPast ? 'text-gray-400' :
              'text-gray-600'
            }`}
          >
            {w.word}{' '}
          </span>
        )
      })}
    </p>
  )
}

function ExportButton({ segments, videoId, onTaskCreated }: { segments: Segment[]; videoId: string; onTaskCreated: (id: string) => void }) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    const validSegments = segments
      .filter((s) => s.inTime !== null && s.outTime !== null)
      .map((s) => ({ name: s.name, in: s.inTime!, out: s.outTime! }))

    if (validSegments.length === 0) return

    setLoading(true)
    try {
      const { id } = await createTask(videoId, validSegments)
      await startTaskProcessing(id)
      onTaskCreated(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating task')
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleExport}
        disabled={loading}
        className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-medium cursor-pointer"
      >
        {loading ? 'Creando tarea...' : `Procesar ${segments.filter(s => s.inTime !== null && s.outTime !== null).length} segmentos`}
      </button>
    </div>
  )
}
