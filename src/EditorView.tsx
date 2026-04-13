import { useRef, useState, useCallback } from 'react'
import { Stream } from '@cloudflare/stream-react'
import type { StreamPlayerApi } from '@cloudflare/stream-react'
import type { JobStatus, Segment, ThematicBlock, TranscriptWord } from './types'
import { formatTime } from './utils'
import { Timeline } from './Timeline'
import { SegmentList } from './SegmentList'

const STREAM_CUSTOMER_CODE = import.meta.env.VITE_STREAM_CUSTOMER_CODE || 'wh3wnchtu0i0y4kd'

interface Props {
  job: JobStatus
}

export function EditorView({ job }: Props) {
  const streamRef = useRef<StreamPlayerApi>(undefined)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [segments, setSegments] = useState<Segment[]>([])
  const [lockedSegmentId, setLockedSegmentId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

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

  const createSegmentFromBlock = (block: ThematicBlock) => {
    const exists = segments.find((s) => s.name === block.title)
    if (exists) return
    setSegments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: block.title,
        inTime: block.startTime,
        outTime: block.endTime,
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

  // Find which block a time falls in
  const activeBlock = blocks.find((b) => currentTime >= b.startTime && currentTime <= b.endTime)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="flex h-screen">
        {/* Left panel: Transcript blocks */}
        <div className="w-96 border-r border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-bold text-lg">Bloques tematicos</h2>
            <p className="text-gray-500 text-xs mt-1">{blocks.length} bloques detectados</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                isActive={activeBlock?.id === block.id}
                isSelected={selectedBlockId === block.id}
                currentTime={currentTime}
                onPlay={() => playFrom(block.startTime)}
                onSelect={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                onCreateSegment={() => createSegmentFromBlock(block)}
              />
            ))}
          </div>
        </div>

        {/* Right panel: Video + segments */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Player */}
          <div className="bg-gray-900 p-4">
            <div className="max-w-2xl mx-auto">
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
            <div className="max-w-2xl mx-auto mt-2 text-sm text-gray-400 font-mono text-center">
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

          {/* Active transcript word highlight */}
          {words.length > 0 && (
            <div className="px-4 py-2 bg-gray-900/50 border-y border-gray-800">
              <WordHighlight words={words} currentTime={currentTime} onWordClick={seekTo} />
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
              onLock={setLockedSegmentId}
              onUpdate={updateSegment}
              onRemove={removeSegment}
              onSeek={seekTo}
            />

            {/* Export */}
            {segments.length > 0 && (
              <ExportButton segments={segments} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BlockCard({
  block,
  isActive,
  isSelected,
  currentTime,
  onPlay,
  onSelect,
  onCreateSegment,
}: {
  block: ThematicBlock
  isActive: boolean
  isSelected: boolean
  currentTime: number
  onPlay: () => void
  onSelect: () => void
  onCreateSegment: () => void
}) {
  const progress = isActive
    ? Math.min(100, ((currentTime - block.startTime) / (block.endTime - block.startTime)) * 100)
    : 0

  return (
    <div
      className={`rounded-lg p-3 text-sm transition-colors cursor-pointer ${
        isActive ? 'bg-blue-900/30 ring-1 ring-blue-600' :
        isSelected ? 'bg-gray-800 ring-1 ring-gray-600' :
        'bg-gray-900 hover:bg-gray-800/70'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{block.title}</h3>
          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{block.summary}</p>
          <div className="flex items-center gap-2 mt-2 text-xs font-mono text-gray-500">
            <span>{formatTime(block.startTime)}</span>
            <span>-</span>
            <span>{formatTime(block.endTime)}</span>
            <span className="text-gray-600">({formatTime(block.endTime - block.startTime)})</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="mt-2 h-0.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); onPlay() }}
          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs cursor-pointer"
        >
          Play
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCreateSegment() }}
          className="px-2 py-1 bg-green-800 hover:bg-green-700 rounded text-xs cursor-pointer"
        >
          + Segmento
        </button>
      </div>
    </div>
  )
}

function WordHighlight({
  words,
  currentTime,
  onWordClick,
}: {
  words: TranscriptWord[]
  currentTime: number
  onWordClick: (time: number) => void
}) {
  // Show a window of words around current time
  const currentIdx = words.findIndex((w) => w.start <= currentTime && w.end >= currentTime)
  const start = Math.max(0, (currentIdx >= 0 ? currentIdx : 0) - 20)
  const end = Math.min(words.length, start + 50)
  const visible = words.slice(start, end)

  return (
    <p className="text-sm leading-relaxed">
      {visible.map((w, i) => {
        const isActive = currentTime >= w.start && currentTime <= w.end
        const isPast = currentTime > w.end
        return (
          <span
            key={start + i}
            onClick={() => onWordClick(w.start)}
            className={`cursor-pointer transition-colors ${
              isActive ? 'text-blue-400 font-bold' :
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

function ExportButton({ segments }: { segments: Segment[] }) {
  const [show, setShow] = useState(false)
  const json = JSON.stringify(
    segments
      .filter((s) => s.inTime !== null && s.outTime !== null)
      .map((s) => ({ name: s.name, in: s.inTime, out: s.outTime })),
    null,
    2,
  )

  return (
    <div className="mt-4">
      <button
        onClick={() => setShow(!show)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium cursor-pointer"
      >
        Exportar segmentos
      </button>
      {show && (
        <pre className="mt-3 p-3 bg-gray-900 rounded-lg text-xs overflow-x-auto font-mono text-green-400">
          {json}
        </pre>
      )}
    </div>
  )
}
