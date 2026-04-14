import { useState, useEffect, useCallback } from 'react'
import type { JobStatus, VideoSummary, SuggestedSegment } from './types'
import { HomeView } from './HomeView'
import { UploadView } from './UploadView'
import { ProcessingView } from './ProcessingView'
import { EditorView } from './EditorView'
import { TaskView } from './TaskView'
import { OutputView } from './OutputView'
import { getVideo } from './api'

function useRoute() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string) => {
    window.history.pushState(null, '', to)
    setPath(to)
  }, [])

  return { path, navigate }
}

export default function App() {
  const { path, navigate } = useRoute()
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobData, setJobData] = useState<JobStatus | null>(null)
  const [suggested, setSuggested] = useState<SuggestedSegment[] | undefined>(undefined)

  // Route: /upload
  if (path === '/upload') {
    return (
      <UploadView
        onJobStarted={(id) => {
          setJobId(id)
          navigate(`/processing/${id}`)
        }}
      />
    )
  }

  // Route: /processing/:id (video upload processing)
  const processingMatch = path.match(/^\/processing\/(.+)$/)
  if (processingMatch) {
    const id = jobId || processingMatch[1]
    return (
      <ProcessingView
        jobId={id}
        onReady={(job, sug) => {
          setJobData(job)
          setSuggested(sug)
          navigate(`/editor/${job.id}`)
        }}
      />
    )
  }

  // Route: /editor/:id
  const editorMatch = path.match(/^\/editor\/(.+)$/)
  if (editorMatch) {
    const videoId = editorMatch[1]

    if (jobData && jobData.id === videoId) {
      return (
        <EditorView
          job={jobData}
          suggestedSegments={suggested}
          onTaskCreated={(taskId) => navigate(`/process/${taskId}`)}
          onBack={() => navigate('/')}
        />
      )
    }

    // Load from D1
    return (
      <EditorLoader
        videoId={videoId}
        onLoaded={(job, sug) => { setJobData(job); setSuggested(sug) }}
        onTaskCreated={(taskId) => navigate(`/process/${taskId}`)}
        onBack={() => navigate('/')}
      />
    )
  }

  // Route: /process/:taskId
  const processMatch = path.match(/^\/process\/(.+)$/)
  if (processMatch) {
    return (
      <TaskView
        taskId={processMatch[1]}
        onBack={() => navigate('/')}
        onComplete={(taskId) => navigate(`/output/${taskId}`)}
      />
    )
  }

  // Route: /output/:taskId
  const outputMatch = path.match(/^\/output\/(.+)$/)
  if (outputMatch) {
    return (
      <OutputView
        taskId={outputMatch[1]}
        onBack={() => navigate('/')}
      />
    )
  }

  // Default: Home
  return (
    <HomeView
      onUpload={() => navigate('/upload')}
      onViewOutput={(taskId) => navigate(`/output/${taskId}`)}
      onViewProcess={(taskId) => navigate(`/process/${taskId}`)}
      onSelectVideo={async (video: VideoSummary) => {
        if (video.status === 'ready' && video.stream_uid) {
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
          navigate(`/editor/${video.id}`)
        } else if (video.status === 'processing' || video.status === 'uploading') {
          setJobId(video.id)
          navigate(`/processing/${video.id}`)
        }
      }}
    />
  )
}

// Loads video data from D1 then renders EditorView
function EditorLoader({ videoId, onLoaded, onTaskCreated, onBack }: {
  videoId: string
  onLoaded: (job: JobStatus, suggested?: SuggestedSegment[]) => void
  onTaskCreated: (taskId: string) => void
  onBack: () => void
}) {
  const [job, setJob] = useState<JobStatus | null>(null)
  const [sug, setSug] = useState<SuggestedSegment[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getVideo(videoId).then((full) => {
      const j: JobStatus = {
        id: full.id,
        status: 'ready',
        streamUid: full.stream_uid || undefined,
        transcript: full.transcript_words ? {
          text: full.transcript_text || '',
          words: full.transcript_words,
        } : undefined,
        blocks: full.blocks || undefined,
      }
      setJob(j)
      setSug(full.suggested_segments || undefined)
      onLoaded(j, full.suggested_segments || undefined)
    }).catch((err) => setError(err.message))
  }, [videoId, onLoaded])

  if (error) return <div className="min-h-screen bg-gray-950 text-red-400 flex items-center justify-center">{error}</div>
  if (!job) return <div className="min-h-screen bg-gray-950 text-gray-500 flex items-center justify-center">Cargando video...</div>

  return <EditorView job={job} suggestedSegments={sug} onTaskCreated={onTaskCreated} onBack={onBack} />
}
