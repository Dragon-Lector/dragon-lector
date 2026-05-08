import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import PhaseBadge from '../components/PhaseBadge'

export default function HomePage() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    fetchChallenges()
  }, [])

  async function fetchChallenges() {
    const { data } = await supabase
      .from('challenges')
      .select(`
        *,
        challenge_participants(count),
        stories(count)
      `)
      .order('created_at', { ascending: false })
    setChallenges(data || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen paper-bg">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-10 animate-fade-in">
          <p className="font-mono text-xs text-ink-400 uppercase tracking-[0.25em] mb-2">
            ✦ Retos mensuales
          </p>
          <h2 className="font-display text-3xl text-ink-900 italic">
            Hola, {profile?.username}
          </h2>
          <p className="text-ink-400 font-body mt-2 text-sm">
            Escribe, comenta y vota de forma anónima.
          </p>
          <div className="w-12 h-px bg-ink-300 mt-4" />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-ink-100 rounded w-1/3 mb-3" />
                <div className="h-6 bg-ink-100 rounded w-2/3 mb-2" />
                <div className="h-4 bg-ink-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-display text-2xl text-ink-300 italic mb-2">Nada aún</p>
            <p className="text-ink-400 text-sm">El administrador publicará el primer reto pronto.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {challenges.map((ch) => (
              <Link key={ch.id} to={`/challenge/${ch.id}`}>
                <div className="card p-6 hover:border-ink-300 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <PhaseBadge phase={ch.phase} />
                    <span className="text-xs font-mono text-ink-300">
                      Máx. {ch.max_words} palabras
                    </span>
                  </div>

                  <h3 className="font-display text-xl text-ink-900 italic mb-1 group-hover:text-ink-700 transition-colors">
                    {ch.theme}
                  </h3>
                  <p className="text-sm font-body text-ink-500 mb-4 line-clamp-2">
                    {ch.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-mono text-ink-300">
                    <span>{ch.stories?.[0]?.count ?? 0} historias</span>
                    <span>·</span>
                    <span>{ch.challenge_participants?.[0]?.count ?? 0} participantes</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
