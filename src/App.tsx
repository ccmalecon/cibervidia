import { useState } from 'react'
import type { JobStatus } from './types'
import { UploadView } from './UploadView'
import { ProcessingView } from './ProcessingView'
import { EditorView } from './EditorView'

type View = 'upload' | 'processing' | 'editor'

export default function App() {
  const [view, setView] = useState<View>('upload')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobData, setJobData] = useState<JobStatus | null>(null)

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
    return <EditorView job={jobData} />
  }

  return null
}
