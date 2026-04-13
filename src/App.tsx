import { useState } from 'react'
import type { JobStatus, VideoSummary } from './types'
import { HomeView } from './HomeView'
import { UploadView } from './UploadView'
import { ProcessingView } from './ProcessingView'
import { EditorView } from './EditorView'
import { TaskView } from './TaskView'
import { getVideo } from './api'

type View = 'home' | 'upload' | 'processing' | 'editor' | 'task'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobData, setJobData] = useState<JobStatus | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)

  if (view === 'home') {
    return (
      <HomeView
        onUpload={() => setView('upload')}
        onSelectVideo={async (video: VideoSummary) => {
          if (video.status === 'ready' && video.stream_uid) {
            // Load full video data from D1
            const full = await getVideo(video.id)
            setJobData({
              id: full.id,
              status: 'ready',
              streamUid: full.stream_uid || undefined,
              transcript: full.transcript_words ? {
                text: full.transcript_text || '',
                words: full.transcript_words,
              } : undefined,
              blocks: full.blocks || undefined,
            })
            setView('editor')
          } else if (video.status === 'processing' || video.status === 'uploading') {
            setJobId(video.id)
            setView('processing')
          }
        }}
      />
    )
  }

  if (view === 'upload') {
    return (
      <UploadView
        onJobStarted={(id) => {
          setJobId(id)
          setView('processing')
        }}
      />
    )
  }

  if (view === 'processing' && jobId) {
    return (
      <ProcessingView
        jobId={jobId}
        onReady={(job) => {
          setJobData(job)
          setView('editor')
        }}
      />
    )
  }

  if (view === 'editor' && jobData) {
    return (
      <EditorView
        job={jobData}
        onTaskCreated={(id) => {
          setTaskId(id)
          setView('task')
        }}
        onBack={() => setView('home')}
      />
    )
  }

  if (view === 'task' && taskId) {
    return (
      <TaskView
        taskId={taskId}
        onBack={() => setView('home')}
      />
    )
  }

  return null
}
