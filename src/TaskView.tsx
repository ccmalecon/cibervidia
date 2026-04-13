import { useState, useEffect, useCallback } from 'react'
import { getTask, startTaskProcessing } from './api'
import type { TaskDetail, TaskLogEntry } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'https://videoprocess.malecon.workers.dev'

interface ProgressStep {
  id: string
  label: string
  status: string
  progress: number
  eta?: string
}

interface Props {
  taskId: string
  onBack: () => void
  onComplete: (taskId: string) => void
}

export function TaskView({ taskId, onBack, onComplete }: Props) {
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [steps, setSteps] = useState<ProgressStep[]>([])
  const [started, setStarted] = useState(false)

  const poll = useCallback(async () => {
    try {
      const t = await getTask(taskId)
      setTask(t)

      if (t.status === 'processing' || t.status === 'done') {
        const resp = await fetch(`${API_BASE}/tasks/${taskId}/progress`)
        const prog = await resp.json() as { status: string; steps: ProgressStep[] }
        setSteps(prog.steps)
      }
    } catch {}
  }, [taskId])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [poll])

  const handleStart = async () => {
    setStarted(true)
    await startTaskProcessing(taskId)
    poll()
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Cargando tarea...</p>
      </div>
    )
  }

  const isDone = task.status === 'done'
  const isError = task.status === 'error'
  const isProcessing = task.status === 'processing'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm mb-4 cursor-pointer">
          &larr; Home
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tarea de segmentos</h1>
            <p className="text-gray-500 text-xs font-mono mt-1">{task.id}</p>
          </div>
          <span className={`text-sm font-medium ${
            isDone ? 'text-green-400' : isError ? 'text-red-400' : isProcessing ? 'text-blue-400' : 'text-yellow-400'
          }`}>
            {task.status}
          </span>
        </div>

        {/* Start button */}
        {task.status === 'pending' && !started && (
          <button
            onClick={handleStart}
            className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium mb-6 cursor-pointer"
          >
            Iniciar procesamiento
          </button>
        )}

        {/* Done — view outputs */}
        {isDone && (
          <button
            onClick={() => onComplete(taskId)}
            className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium mb-6 cursor-pointer"
          >
            Ver videos generados
          </button>
        )}

        {/* Progress steps */}
        {steps.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold mb-4">Progreso</h2>
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {step.status === 'done' && <span className="text-green-400">&#10003;</span>}
                      {step.status === 'processing' && <span className="text-blue-400 animate-pulse">&#9679;</span>}
                      {step.status === 'pending' && <span className="text-gray-600">&#9675;</span>}
                      <span className={step.status === 'pending' ? 'text-gray-600' : 'text-gray-200'}>
                        {step.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {step.eta && <span className="text-gray-500">{step.eta}</span>}
                      <span className={`font-mono ${
                        step.status === 'done' ? 'text-green-400' :
                        step.status === 'processing' ? 'text-blue-400' :
                        'text-gray-600'
                      }`}>
                        {step.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        step.status === 'done' ? 'bg-green-500' :
                        step.status === 'processing' ? 'bg-blue-500' :
                        'bg-gray-700'
                      }`}
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Segments summary */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">Segmentos ({task.segments.length})</h2>
          <div className="space-y-1">
            {task.segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-gray-600 font-mono w-6">{i + 1}</span>
                <span className="flex-1 truncate text-gray-300">{seg.name}</span>
                <span className="text-gray-500 font-mono">{seg.in.toFixed(1)}s - {seg.out.toFixed(1)}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm font-mono break-all">{task.logs[task.logs.length - 1]?.msg}</p>
          </div>
        )}

        {/* Logs */}
        <details className="bg-gray-900 rounded-lg overflow-hidden">
          <summary className="px-4 py-2 bg-gray-800 border-b border-gray-700 text-sm font-medium cursor-pointer">
            Logs ({task.logs.length})
          </summary>
          <div className="max-h-[300px] overflow-y-auto p-3 space-y-1 font-mono text-xs">
            {task.logs.map((log: TaskLogEntry, i: number) => (
              <div key={i} className={`flex gap-2 ${log.level === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                <span className="text-gray-600 shrink-0">
                  {new Date(log.ts).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 px-1 rounded ${log.level === 'error' ? 'bg-red-900/50' : 'bg-gray-800'}`}>
                  {log.step}
                </span>
                <span className="break-all">{log.msg}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}
