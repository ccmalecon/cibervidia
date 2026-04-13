const API_BASE = import.meta.env.VITE_API_URL || 'https://videoprocess.malecon.workers.dev'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, options)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText })) as { error?: string }
    throw new Error(err.error || `Request failed: ${resp.status}`)
  }
  return resp.json() as Promise<T>
}

export async function initUpload(): Promise<{ id: string; uploadUrl: string }> {
  return request('/upload/init', { method: 'POST' })
}

export async function uploadFileToR2(uploadUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
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

export async function getJobStatus(id: string): Promise<import('./types').JobStatus> {
  return request(`/status/${id}`)
}

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
  error?: string
}> {
  return request(`/transcribe/${id}`)
}
