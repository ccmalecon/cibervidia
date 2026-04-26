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

export interface VideoSummary {
  id: string
  r2_key: string
  stream_uid: string | null
  audio_r2_key: string | null
  transcript_text: string | null
  status: string
  file_size: number | null
  created_at: string
}

export interface SuggestedSegment {
  name: string
  startTime: number
  endTime: number
  reason: string
}

export interface VideoDetail extends VideoSummary {
  transcript_words: TranscriptWord[] | null
  blocks: ThematicBlock[] | null
  instructions: string | null
  overview: string | null
  suggested_segments: SuggestedSegment[] | null
}

export interface TaskLogEntry {
  ts: string
  step: string
  msg: string
  level: 'info' | 'error'
}

export interface TaskDetail {
  id: string
  video_id: string
  type: string
  segments: { name: string; in: number; out: number }[]
  status: string
  logs: TaskLogEntry[]
  created_at: string
}
