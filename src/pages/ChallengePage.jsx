import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import PhaseBadge, { PhaseSteps } from '../components/PhaseBadge'
import SubmissionPhase from '../components/phases/SubmissionPhase'
import CommentingPhase from '../components/phases/CommentingPhase'
import VotingPhase from '../components/phases/VotingPhase'
import RevealPhase from '../components/phases/RevealPhase'

export default function ChallengePage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState(null)
  const [stories, setStories] = useState([])
  const [myStory, setMyStory] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const [{ data: ch }, { data: sts }, { data: part }] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', id).single(),
      supabase.from('stories').select('*, profiles(username)').eq('challenge_id', id).order('created_at'),
      supabase.from('challenge_participants').select('*').eq('challenge_id', id).eq('user_id', user.id).single()
    ])
    setChallenge(ch)
    setStories(sts || [])
    setParticipation(part)
    setMyStory((sts || []).find(s => s.author_id === user.id) || null)
    setLoading(false)
  }, [id, user.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (loading) return (
    <div className="min-h-screen paper-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="font-mono text-ink-300 text-sm">Cargando reto...</p>
      </div>
    </div>
  )

  if (!challenge) return (
    <div className="min-h-screen paper-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="font-display text-2xl text-ink-300 italic">Reto no encontrado</p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-6">Volver</button>
      </div>
    </div>
  )

  async function joinAsReader() {
    await supabase.from('challenge_participants').insert({
      challenge_id: id,
      user_id: user.id,
      role: 'reader'
    })
    fetchAll()
  }

  const phaseProps = { challenge, stories, myStory, user, profile, onRefresh: fetchAll, participation }

  return (
    <div className="min-h-screen paper-bg">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Header del reto */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={() => navigate('/')}
            className="text-xs font-mono text-ink-300 hover:text-ink-600 transition-colors mb-4 block"
          >
            ← Todos los retos
          </button>
          <p className="font-mono text-xs text-ink-400 uppercase tracking-[0.2em] mb-2">
            Reto del mes
          </p>
          <h2 className="font-display text-3xl text-ink-900 italic mb-3">
            "{challenge.theme}"
          </h2>
          {challenge.description && (
            <p className="text-ink-500 font-body text-sm mb-4">{challenge.description}</p>
          )}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <PhaseBadge phase={challenge.phase} />
            <PhaseSteps current={challenge.phase} />
          </div>
          <div className="w-full h-px bg-ink-100 mt-6" />
        </div>

        {/* Si no ha participado aún y no es escritor, mostrar opción de unirse como lector */}
        {!participation && challenge.phase === 'commenting' && (
          <div className="card p-5 mb-6 border-amber-200 bg-amber-50/50">
            <p className="text-sm font-body text-ink-600 mb-3">
              ¿Quieres participar votando? Únete como lector. Necesitarás comentar todas las historias para poder votar.
            </p>
            <button onClick={joinAsReader} className="btn-secondary text-sm py-2">
              Unirme como lector
            </button>
          </div>
        )}

        {/* Fase activa */}
        <div className="animate-slide-up">
          {challenge.phase === 'submission' && <SubmissionPhase {...phaseProps} />}
          {challenge.phase === 'commenting' && <CommentingPhase {...phaseProps} />}
          {challenge.phase === 'voting' && <VotingPhase {...phaseProps} />}
          {challenge.phase === 'reveal' && <RevealPhase {...phaseProps} />}
        </div>

      </main>
    </div>
  )
}
