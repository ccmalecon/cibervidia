import { useRef, useState, useCallback, useEffect } from 'react'
import type { ThematicBlock, TranscriptWord, Segment } from './types'
import { formatTime } from './utils'

const BLOCK_COLORS = [
  'bg-blue-950/30',
  'bg-purple-950/30',
  'bg-teal-950/30',
  'bg-orange-950/30',
  'bg-pink-950/30',
  'bg-cyan-950/30',
]

const MARKER_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
]

interface Props {
  blocks: ThematicBlock[]
  words: TranscriptWord[]
  segments: Segment[]
  highlightedSegmentId: string | null
  currentTime: number
  onPlay: (time: number) => void
  onSeek: (time: number) => void
  onCreateSegment: (name: string, inTime: number, outTime: number) => void
}

export function TranscriptPanel({ blocks, words, segments, highlightedSegmentId, currentTime, onPlay, onSeek, onCreateSegment }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; x: number; y: number } | null>(null)

  // Map each word to its block index
  const blockMap = useCallback(() => {
    const map = new Map<number, number>()
    words.forEach((w, wi) => {
      const bi = blocks.findIndex((b) => w.start >= b.startTime && w.end <= b.endTime)
      if (bi >= 0) map.set(wi, bi)
    })
    return map
  }, [words, blocks])()

  // Find highlighted segment
  const highlightedSeg = highlightedSegmentId ? segments.find(s => s.id === highlightedSegmentId) : null

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !panelRef.current) {
      return
    }

    const range = sel.getRangeAt(0)
    const container = panelRef.current

    const wordSpans = container.querySelectorAll('[data-word-idx]')
    let firstIdx = -1
    let lastIdx = -1

    wordSpans.forEach((span) => {
      if (sel.containsNode(span, true)) {
        const idx = parseInt(span.getAttribute('data-word-idx') || '-1')
        if (idx >= 0) {
          if (firstIdx === -1) firstIdx = idx
          lastIdx = idx
        }
      }
    })

    if (firstIdx >= 0 && lastIdx >= 0 && firstIdx <= lastIdx) {
      // Position popup at end of selection (bottom-right of last line)
      const rects = range.getClientRects()
      const lastRect = rects[rects.length - 1]
      const panelRect = container.getBoundingClientRect()
      const scrollTop = container.scrollTop

      setSelectionRange({
        start: firstIdx,
        end: lastIdx,
        x: lastRect.right - panelRect.left,
        y: lastRect.bottom - panelRect.top + scrollTop + 4,
      })
    }
  }, [])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (selectionRange && !(e.target as HTMLElement).closest('[data-selection-popup]')) {
        setTimeout(() => setSelectionRange(null), 150)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selectionRange])

  const handleCreateFromSelection = () => {
    if (!selectionRange) return
    const startWord = words[selectionRange.start]
    const endWord = words[selectionRange.end]
    const selectedText = words.slice(selectionRange.start, selectionRange.end + 1).map(w => w.word).join(' ')
    const name = selectedText.length > 60 ? selectedText.slice(0, 57) + '...' : selectedText
    onCreateSegment(name, startWord.start, endWord.end)
    setSelectionRange(null)
    window.getSelection()?.removeAllRanges()
  }

  // Track block index for headers
  let prevBlockIdx = -1

  return (
    <div className="w-96 border-r border-gray-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-bold text-lg">Transcript</h2>
        <p className="text-gray-500 text-xs mt-1">{words.length} palabras / {blocks.length} bloques</p>
      </div>

      <div ref={panelRef} className="flex-1 overflow-y-auto relative" onMouseUp={handleMouseUp}>
        {/* Selection popup — positioned at end of selected text */}
        {selectionRange && (
          <div
            data-selection-popup
            className="absolute z-20 flex gap-1"
            style={{
              left: `${Math.min(selectionRange.x, 280)}px`,
              top: `${selectionRange.y}px`,
            }}
          >
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateFromSelection}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-md text-xs font-medium shadow-lg shadow-black/50 cursor-pointer whitespace-nowrap"
            >
              + Segmento ({formatTime(words[selectionRange.start].start)} - {formatTime(words[selectionRange.end].end)})
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPlay(words[selectionRange.start].start)}
              className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-xs shadow-lg shadow-black/50 cursor-pointer"
            >
              Play
            </button>
          </div>
        )}

        {/* Continuous text */}
        <div className="text-sm leading-relaxed select-text px-2 py-2">
          {words.map((word, wi) => {
            const bi = blockMap.get(wi) ?? -1
            const blockChanged = bi !== prevBlockIdx
            const block = bi >= 0 ? blocks[bi] : null

            // Block header
            let blockHeader = null
            if (blockChanged && block) {
              prevBlockIdx = bi
              blockHeader = (
                <span key={`header-${bi}`} className="flex items-center gap-2 px-2 pt-3 pb-1">
                  <span className={`w-1 h-4 rounded shrink-0 ${MARKER_COLORS[bi % MARKER_COLORS.length]}`} />
                  <span className="text-xs font-semibold text-gray-400 truncate">{block.title}</span>
                  <span className="text-xs text-gray-600 font-mono shrink-0">{formatTime(block.startTime)}</span>
                  {activeBlockId === block.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onPlay(block.startTime) }}
                      className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs cursor-pointer ml-auto shrink-0"
                    >
                      Play
                    </button>
                  )}
                </span>
              )
            }

            // Background: block color (subtle)
            const bgColor = bi >= 0 ? BLOCK_COLORS[bi % BLOCK_COLORS.length] : ''

            // Is word inside the highlighted segment?
            const inHighlightedSeg = highlightedSeg
              && highlightedSeg.inTime !== null
              && highlightedSeg.outTime !== null
              && word.start >= highlightedSeg.inTime
              && word.end <= highlightedSeg.outTime

            // Active word (playing now)
            const isActive = currentTime >= word.start && currentTime <= word.end

            // Word classes
            const wordClasses = [
              'cursor-pointer transition-colors inline',
              // Background
              inHighlightedSeg ? 'bg-blue-800/40' : bgColor,
              // Padding at block edges
              blockChanged && bi >= 0 ? 'pl-2' : '',
              // Text color
              isActive ? 'text-blue-300 font-bold underline decoration-blue-400' : '',
              !isActive && inHighlightedSeg ? 'text-gray-100' : '',
              !isActive && !inHighlightedSeg ? 'text-gray-500' : '',
            ].filter(Boolean).join(' ')

            return (
              <span key={wi}>
                {blockHeader}
                <span
                  data-word-idx={wi}
                  onClick={() => {
                    if (!window.getSelection()?.toString()) {
                      if (block) {
                        setActiveBlockId(activeBlockId === block.id ? null : block.id)
                      }
                      onSeek(word.start)
                    }
                  }}
                  className={wordClasses}
                >
                  {word.word}{' '}
                </span>
              </span>
            )
          })}
        </div>
        <div className="h-32" />
      </div>
    </div>
  )
}
