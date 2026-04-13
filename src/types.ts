export interface Segment {
  id: string
  name: string
  inTime: number | null
  outTime: number | null
}

export interface TranscriptWord {
  word: string
  start: number
  end: number
}

export interface ThematicBlock {
  id: string
  title: string
  summary: string
  startTime: number
  endTime: number
  words: TranscriptWord[]
}

export interface LogEntry {
  ts: string
  step: string
  msg: string
  level: 'info' | 'error' | 'warn'
  data?: unknown
}

export interface JobStatus {
  id: string
  status: 'uploading' | 'processing' | 'transcribing' | 'analyzing' | 'ready' | 'done' | 'error'
  streamUid?: string
  transcript?: {
    text: string
    words: TranscriptWord[]
  }
  blocks?: ThematicBlock[]
  logs?: LogEntry[]
  error?: string
}
