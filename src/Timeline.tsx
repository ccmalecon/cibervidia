import type { Segment } from './types'

const COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
]

interface Props {
  duration: number
  currentTime: number
  segments: Segment[]
  onSeek: (time: number) => void
}

export function Timeline({ duration, currentTime, segments, onSeek }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(ratio * duration)
  }

  return (
    <div className="mb-6">
      <div
        className="relative h-12 bg-gray-800 rounded-lg cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
        {/* Segment blocks */}
        {segments.map((seg, i) => {
          if (seg.inTime === null) return null
          const left = (seg.inTime / duration) * 100
          const end = seg.outTime ?? currentTime
          const width = ((end - seg.inTime) / duration) * 100
          return (
            <div
              key={seg.id}
              className={`absolute top-1 bottom-1 rounded ${COLORS[i % COLORS.length]} opacity-60`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.3)}%` }}
              title={seg.name}
            />
          )
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      {/* Time ticks */}
      <div className="flex justify-between mt-1 text-xs text-gray-500 font-mono">
        {Array.from({ length: 11 }, (_, i) => {
          const t = (duration / 10) * i
          const m = Math.floor(t / 60)
          const s = Math.floor(t % 60)
          return (
            <span key={i}>
              {m}:{s.toString().padStart(2, '0')}
            </span>
          )
        })}
      </div>
    </div>
  )
}
