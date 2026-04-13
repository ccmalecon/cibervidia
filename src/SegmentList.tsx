import type { Segment } from './types'
import { formatTime } from './utils'

interface Props {
  segments: Segment[]
  videoUid: string
  customerCode: string
  duration: number
  lockedSegmentId: string | null
  highlightedSegmentId: string | null
  onLock: (id: string | null) => void
  onHighlight: (id: string | null) => void
  onUpdate: (id: string, updates: Partial<Segment>) => void
  onRemove: (id: string) => void
  onSeek: (time: number) => void
}

function SegmentThumb({ customerCode, videoUid, time }: { customerCode: string; videoUid: string; time: number }) {
  const url = `https://customer-${customerCode}.cloudflarestream.com/${videoUid}/thumbnails/thumbnail.jpg?time=${Math.floor(time)}s&width=320`
  return (
    <img
      src={url}
      alt="Thumbnail"
      className="w-40 h-24 rounded object-cover bg-black shrink-0"
    />
  )
}

function RangeSlider({ inTime, outTime, duration, onChange, onSeek }: {
  inTime: number
  outTime: number
  duration: number
  onChange: (inTime: number, outTime: number) => void
  onSeek: (time: number) => void
}) {
  const toPercent = (v: number) => (v / duration) * 100
  const inPct = toPercent(inTime)
  const outPct = toPercent(outTime)

  return (
    <div className="mt-3 space-y-2">
      <div
        className="relative h-6 bg-gray-800 rounded cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const time = ((e.clientX - rect.left) / rect.width) * duration
          onSeek(time)
        }}
      >
        {/* Selected range */}
        <div
          className="absolute top-0 bottom-0 bg-blue-600/30 rounded"
          style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }}
        />
        {/* IN handle */}
        <div
          className="absolute top-0 bottom-0 w-3 bg-green-500 rounded-l cursor-ew-resize z-10 hover:bg-green-400"
          style={{ left: `${inPct}%` }}
          title={`IN: ${formatTime(inTime)}`}
          onMouseDown={(e) => {
            e.stopPropagation()
            const bar = e.currentTarget.parentElement!
            const onMove = (ev: MouseEvent) => {
              const rect = bar.getBoundingClientRect()
              const t = Math.max(0, Math.min(outTime - 1, ((ev.clientX - rect.left) / rect.width) * duration))
              onChange(t, outTime)
              onSeek(t)
            }
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        />
        {/* OUT handle */}
        <div
          className="absolute top-0 bottom-0 w-3 bg-red-500 rounded-r cursor-ew-resize z-10 hover:bg-red-400"
          style={{ left: `calc(${outPct}% - 12px)` }}
          title={`OUT: ${formatTime(outTime)}`}
          onMouseDown={(e) => {
            e.stopPropagation()
            const bar = e.currentTarget.parentElement!
            const onMove = (ev: MouseEvent) => {
              const rect = bar.getBoundingClientRect()
              const t = Math.max(inTime + 1, Math.min(duration, ((ev.clientX - rect.left) / rect.width) * duration))
              onChange(inTime, t)
              onSeek(t)
            }
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-gray-500">
        <span className="text-green-400">IN: {formatTime(inTime)}</span>
        <span className="text-gray-400">{formatTime(outTime - inTime)}</span>
        <span className="text-red-400">OUT: {formatTime(outTime)}</span>
      </div>
    </div>
  )
}

export function SegmentList({ segments, videoUid, customerCode, duration, lockedSegmentId, highlightedSegmentId, onLock, onHighlight, onUpdate, onRemove, onSeek }: Props) {

  if (segments.length === 0) {
    return (
      <p className="text-gray-500 text-sm mt-4">
        No hay segmentos. Reproduce el video y pulsa "Marcar IN" para empezar.
      </p>
    )
  }

  return (
    <div className="space-y-3 mt-4">
      <h2 className="text-lg font-semibold">Segmentos ({segments.length})</h2>
      {segments.map((seg) => {
        const complete = seg.inTime !== null && seg.outTime !== null
        const isExpanded = lockedSegmentId === seg.id
        const isHighlighted = highlightedSegmentId === seg.id
        return (
          <div
            key={seg.id}
            className={`bg-gray-900 rounded-lg p-3 transition-colors ${isHighlighted ? 'ring-1 ring-blue-500' : isExpanded ? 'ring-1 ring-gray-600' : 'hover:bg-gray-900/80'}`}
          >
            <div
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => {
                const newId = isHighlighted ? null : seg.id
                onHighlight(newId)
                if (seg.inTime !== null && !isHighlighted) onSeek(seg.inTime)
              }}
              onDoubleClick={() => {
                const newId = isExpanded ? null : seg.id
                onLock(newId)
              }}
            >
              {/* Thumbnail del punto IN */}
              {seg.inTime !== null ? (
                <SegmentThumb customerCode={customerCode} videoUid={videoUid} time={seg.inTime} />
              ) : (
                <div className="w-40 h-24 rounded bg-gray-800 flex items-center justify-center text-xs text-gray-500 shrink-0">
                  Marcando...
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="text"
                  value={seg.name}
                  onChange={(e) => onUpdate(seg.id, { name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-gray-800 rounded px-2 py-1 text-sm w-full outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-3 text-xs font-mono text-gray-400">
                  <span>IN: {seg.inTime !== null ? formatTime(seg.inTime) : '--'}</span>
                  <span>OUT: {seg.outTime !== null ? formatTime(seg.outTime) : '--'}</span>
                  {complete && (
                    <span className="text-gray-500">
                      ({formatTime(seg.outTime! - seg.inTime!)})
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(seg.id) }}
                className="text-gray-500 hover:text-red-400 text-lg px-2 cursor-pointer"
                title="Eliminar segmento"
              >
                &times;
              </button>
            </div>

            {/* Range slider — expanded */}
            {isExpanded && complete && duration > 0 && (
              <RangeSlider
                inTime={seg.inTime!}
                outTime={seg.outTime!}
                duration={duration}
                onChange={(inTime, outTime) => onUpdate(seg.id, { inTime, outTime })}
                onSeek={onSeek}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
