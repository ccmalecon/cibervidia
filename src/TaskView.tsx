import { useState, useEffect, useCallback } from 'react'
import { getTask, startTaskProcessing } from './api'
import type { TaskDetail, TaskLogEntry } from './types'

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-gray-400',
  error: 'text-red-400',
}

interface Props {
  taskId: string
  onBack: () => void
}

export function TaskView({ taskId, onBack }: Props) {
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [started, setStarted] = useState(false)

  const poll = useCallback(async () => {
    try {
      const t = await getTask(taskId)
      setTask(t)
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
          &larr; Volver
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

        {/* Start button */}
        {task.status === 'pending' && !started && (
          <button
            onClick={handleStart}
            className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium mb-6 cursor-pointer"
          >
            Iniciar procesamiento
          </button>
        )}

        {/* Logs */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium">Logs ({task.logs.length})</span>
            {isProcessing && <span className="text-xs text-blue-400 animate-pulse">procesando...</span>}
          </div>
          <div className="max-h-[500px] overflow-y-auto p-3 space-y-1 font-mono text-xs">
            {task.logs.map((log: TaskLogEntry, i: number) => (
              <div key={i} className={`flex gap-2 ${LEVEL_COLORS[log.level] || 'text-gray-400'}`}>
                <span className="text-gray-600 shrink-0">
                  {new Date(log.ts).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 px-1 rounded ${
                  log.level === 'error' ? 'bg-red-900/50' : 'bg-gray-800'
                }`}>
                  {log.step}
                </span>
                <span className="break-all">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
