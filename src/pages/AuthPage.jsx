import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/')
      } else {
        if (username.length < 3) throw new Error('El nombre debe tener al menos 3 caracteres')
        await signUp(email, password, username)
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Algo salió mal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen paper-bg flex flex-col items-center justify-center px-4">
      {/* Header decorativo */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="font-mono text-ink-300 text-xs tracking-[0.3em] uppercase mb-3">
          ✦ Club de Escritura ✦
        </div>
        <h1 className="font-display text-4xl text-ink-900 italic">
          {mode === 'login' ? 'Bienvenido de nuevo' : 'Únete al club'}
        </h1>
        <div className="mt-3 w-16 h-px bg-ink-300 mx-auto" />
      </div>

      {/* Formulario */}
      <div className="w-full max-w-sm animate-slide-up">
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-1.5">
                  Nombre de usuario
                </label>
                <input
                  className="input-field"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Tu nombre en el club"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-1.5">
                Correo electrónico
              </label>
              <input
                className="input-field"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input
                className="input-field"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                required
              />
            </div>

            {error && (
              <div className="bg-scarlet-400/10 border border-scarlet-400/30 text-scarlet-600 text-sm px-4 py-3 rounded-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink-100 text-center">
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
              className="text-sm text-ink-500 hover:text-ink-800 transition-colors font-body"
            >
              {mode === 'login'
                ? '¿No tienes cuenta? Regístrate'
                : '¿Ya tienes cuenta? Entra aquí'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-ink-300 mt-6 font-mono">
          Las historias se publican de forma anónima
        </p>
      </div>
    </div>
  )
}
