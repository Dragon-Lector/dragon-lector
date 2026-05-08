import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  return (
    <header className="border-b border-ink-100 bg-cream-50/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-lg text-ink-900 italic">Club de Escritura</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/ruleta"
            className="text-xs font-mono text-ink-400 hover:text-ink-800 uppercase tracking-wider transition-colors"
          >
            🎲 Ruleta
          </Link>
          {profile?.is_admin && (
            <Link
              to="/admin"
              className="text-xs font-mono text-ink-400 hover:text-ink-800 uppercase tracking-wider transition-colors"
            >
              Admin
            </Link>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm font-body text-ink-500 hidden sm:block">
              {profile?.username}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs font-mono text-ink-300 hover:text-scarlet-500 transition-colors uppercase tracking-wider"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
