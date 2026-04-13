import { useRef, useState, useCallback, useEffect } from 'react'
import type { ThematicBlock, TranscriptWord } from './types'
import { formatTime } from './utils'

const BLOCK_COLORS = [
  'bg-blue-950/40',
  'bg-purple-950/40',
  'bg-teal-950/40',
  'bg-orange-950/40',
  'bg-pink-950/40',
  'bg-cyan-950/40',
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
  currentTime: number
  onPlay: (time: number) => void
  onSeek: (time: number) => void
  onCreateSegment: (name: string, inTime: number, outTime: number) => void
}

export function TranscriptPanel({ blocks, words, currentTime, onPlay, onSeek, onCreateSegment }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; x: number; y: number } | null>(null)

  // Map each word to its block index
  const wordBlockMap = useCallback(() => {
    const map = new Map<number, number>()
    words.forEach((w, wi) => {
      const bi = blocks.findIndex((b) => w.start >= b.startTime && w.end <= b.endTime)
      if (bi >= 0) map.set(wi, bi)
    })
    return map
  }, [words, blocks])

  const blockMap = wordBlockMap()

  // Handle text selection → find word range → show create segment popup
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !panelRef.current) {
      setSelectionRange(null)
      return
    }

    // Find the word spans in the selection
    const range = sel.getRangeAt(0)
    const container = panelRef.current

    // Get all word spans inside selection
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
      const rect = range.getBoundingClientRect()
      const panelRect = container.getBoundingClientRect()
      setSelectionRange({
        start: firstIdx,
        end: lastIdx,
        x: rect.left - panelRect.left + rect.width / 2,
        y: rect.top - panelRect.top - 8,
      })
    }
  }, [])

  // Close popup on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (selectionRange && !(e.target as HTMLElement).closest('[data-selection-popup]')) {
        // Small delay to allow button click to register
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

  // Render words grouped by blocks
  let currentBlockIdx = -1

  return (
    <div className="w-96 border-r border-gray-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-bold text-lg">Transcript</h2>
        <p className="text-gray-500 text-xs mt-1">{words.length} palabras / {blocks.length} bloques</p>
      </div>

      <div ref={panelRef} className="flex-1 overflow-y-auto relative" onMouseUp={handleMouseUp}>
        {/* Selection popup */}
        {selectionRange && (
          <div
            data-selection-popup
            className="absolute z-20 flex gap-1"
            style={{ left: `${Math.max(8, Math.min(selectionRange.x - 60, 260))}px`, top: `${selectionRange.y}px`, transform: 'translateY(-100%)' }}
          >
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateFromSelection}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs font-medium shadow-lg cursor-pointer whitespace-nowrap"
            >
              + Segmento ({formatTime(words[selectionRange.start].start)} - {formatTime(words[selectionRange.end].end)})
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPlay(words[selectionRange.start].start)}
              className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs shadow-lg cursor-pointer"
            >
              Play
            </button>
          </div>
        )}

        {/* Words as continuous text with block backgrounds */}
        <div className="text-sm leading-relaxed select-text">
          {words.map((word, wi) => {
            const bi = blockMap.get(wi) ?? -1
            const blockChanged = bi !== currentBlockIdx
            const block = bi >= 0 ? blocks[bi] : null

            let blockHeader = null
            if (blockChanged && block) {
              currentBlockIdx = bi
              blockHeader = (
                <div key={`header-${bi}`} className="flex items-center gap-2 px-4 pt-4 pb-1">
                  <div className={`w-1 h-4 rounded ${MARKER_COLORS[bi % MARKER_COLORS.length]}`} />
                  <span className="text-xs font-semibold text-gray-400">{block.title}</span>
                  <span className="text-xs text-gray-600 font-mono">{formatTime(block.startTime)}</span>
                  {activeBlockId === block.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onPlay(block.startTime) }}
                      className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs cursor-pointer ml-auto"
                    >
                      Play
                    </button>
                  )}
                </div>
              )
            }

            // Determine background color
            const bgColor = bi >= 0 ? BLOCK_COLORS[bi % BLOCK_COLORS.length] : ''

            // Is this the first word of a block?
            const isBlockStart = blockChanged && bi >= 0
            // Is next word in a different block?
            const nextBi = wi + 1 < words.length ? (blockMap.get(wi + 1) ?? -1) : -2
            const isBlockEnd = nextBi !== bi

            // Active word highlight
            const isActive = currentTime >= word.start && currentTime <= word.end
            const isPast = currentTime > word.end

            // Is word in selection range?
            const isSelected = selectionRange && wi >= selectionRange.start && wi <= selectionRange.end

            return (
              <span key={wi}>
                {blockHeader}
                {isBlockStart && (
                  <span className={`inline ${bgColor} ${isBlockStart ? 'rounded-l pl-4' : ''}`} />
                )}
                <span
                  data-word-idx={wi}
                  onClick={() => {
                    // If no selection, toggle block actions
                    if (!window.getSelection()?.toString()) {
                      if (block) {
                        setActiveBlockId(activeBlockId === block.id ? null : block.id)
                      }
                      onSeek(word.start)
                    }
                  }}
                  className={[
                    'cursor-pointer transition-colors',
                    bgColor,
                    isBlockStart ? 'pl-4' : '',
                    isBlockEnd ? 'pr-4' : '',
                    isActive ? 'text-blue-300 font-bold underline' : '',
                    !isActive && isPast ? 'text-gray-300' : '',
                    !isActive && !isPast ? 'text-gray-500' : '',
                    isSelected ? 'bg-blue-600/30' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {word.word}{' '}
                </span>
              </span>
            )
          })}
        </div>
        {/* Bottom padding */}
        <div className="h-32" />
      </div>
    </div>
  )
}
