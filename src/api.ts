const API_BASE = import.meta.env.VITE_API_URL || 'https://videoprocess.malecon.workers.dev'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, options)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText })) as { error?: string }
    throw new Error(err.error || `Request failed: ${resp.status}`)
  }
  return resp.json() as Promise<T>
}

// Upload
export async function initUpload(): Promise<{ id: string; uploadUrl: string }> {
  return request('/upload/init', { method: 'POST' })
}

export async function uploadFileToR2(uploadUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(file)
  })
}

export async function completeUpload(id: string, instructions?: string): Promise<{ id: string; status: string }> {
  return request(`/upload/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions }),
  })
}

// Job status (KV)
export async function getJobStatus(id: string): Promise<import('./types').JobStatus> {
  return request(`/status/${id}`)
}

export async function retryProcessing(id: string): Promise<{ id: string; status: string }> {
  return request(`/upload/${id}/retry`, { method: 'POST' })
}

// Transcription
export async function startTranscription(id: string, language?: string): Promise<{ id: string; status: string }> {
  return request(`/transcribe/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  })
}

export async function getTranscript(id: string): Promise<{
  id: string
  status: string
  streamUid?: string
  transcript?: { text: string; words: import('./types').TranscriptWord[] }
  blocks?: import('./types').ThematicBlock[]
  logs?: import('./types').LogEntry[]
  error?: string
}> {
  return request(`/transcribe/${id}`)
}

// Videos (D1)
export async function listVideos(): Promise<import('./types').VideoSummary[]> {
  return request('/videos')
}

export async function getVideo(id: string): Promise<import('./types').VideoDetail> {
  return request(`/videos/${id}`)
}

export async function deleteVideo(id: string): Promise<void> {
  await request(`/videos/${id}`, { method: 'DELETE' })
}

// Tasks
export async function createTask(videoId: string, segments: { name: string; in: number; out: number }[]): Promise<{ id: string }> {
  return request('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, segments }),
  })
}

export async function getTask(id: string): Promise<import('./types').TaskDetail> {
  return request(`/tasks/${id}`)
}

export async function startTaskProcessing(id: string): Promise<{ id: string; status: string }> {
  return request(`/tasks/${id}/process`, { method: 'POST' })
}
