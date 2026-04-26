import { useState } from 'react'

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('cv_auth') === '1')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (authed) return <>{children}</>

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input === 'CC.Videos.2026') {
      sessionStorage.setItem('cv_auth', '1')
      setAuthed(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl shadow-lg w-80 flex flex-col gap-4">
        <h2 className="text-white text-lg font-semibold text-center">Acceso restringido</h2>
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false) }}
          placeholder="Contraseña"
          autoFocus
          className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        {error && <p className="text-red-400 text-sm text-center">Contraseña incorrecta</p>}
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition-colors">
          Entrar
        </button>
      </form>
    </div>
  )
}
