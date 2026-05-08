import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import PhaseBadge from '../components/PhaseBadge'

const PHASES_ORDER = ['submission', 'commenting', 'voting', 'reveal']
const PHASE_NEXT = { submission: 'commenting', commenting: 'voting', voting: 'reveal' }
const PHASE_LABELS = {
  submission: 'Envío de historias',
  commenting: 'Comentarios',
  voting: 'Votación',
  reveal: 'Revelación de resultados'
}

export default function AdminPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ theme: '', description: '', max_words: 1000 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile && !profile.is_admin) navigate('/')
  }, [profile, navigate])

  useEffect(() => { fetchChallenges() }, [])

  async function fetchChallenges() {
    const { data } = await supabase
      .from('challenges')
      .select('*, stories(count), challenge_participants(count)')
      .order('created_at', { ascending: false })
    setChallenges(data || [])
  }

  async function createChallenge(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('challenges').insert({
      theme: form.theme.trim(),
      description: form.description.trim(),
      max_words: Number(form.max_words),
      created_by: profile.id
    })
    if (!error) {
      setCreating(false)
      setForm({ theme: '', description: '', max_words: 1000 })
      fetchChallenges()
    }
    setLoading(false)
  }

  async function advancePhase(challenge) {
    const next = PHASE_NEXT[challenge.phase]
    if (!next) return
    await supabase.from('challenges').update({ phase: next }).eq('id', challenge.id)
    fetchChallenges()
  }

  if (!profile?.is_admin) return null

  return (
    <div className="min-h-screen paper-bg">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-8 animate-fade-in">
          <p className="font-mono text-xs text-ink-400 uppercase tracking-[0.25em] mb-2">Panel de</p>
          <h2 className="font-display text-3xl text-ink-900 italic">Administración</h2>
          <div className="w-12 h-px bg-ink-300 mt-3" />
        </div>

        {/* Crear reto */}
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="btn-primary mb-8 flex items-center gap-2"
          >
            + Nuevo reto mensual
          </button>
        ) : (
          <div className="card p-6 mb-8 animate-slide-up">
            <h3 className="font-display italic text-xl text-ink-800 mb-5">Nuevo reto</h3>
            <form onSubmit={createChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-1.5">
                  Tema del reto
                </label>
                <input
                  className="input-field"
                  value={form.theme}
                  onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
                  placeholder='Ej: "El último tren"'
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-1.5">
                  Descripción / instrucciones
                </label>
                <textarea
                  className="input-field min-h-[80px] resize-none"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Contexto adicional para los escritores..."
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-1.5">
                  Máximo de palabras
                </label>
                <input
                  className="input-field"
                  type="number"
                  value={form.max_words}
                  onChange={e => setForm(f => ({ ...f, max_words: e.target.value }))}
                  min={100} max={10000}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creando...' : 'Crear reto'}
                </button>
                <button type="button" onClick={() => setCreating(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de retos */}
        <div className="space-y-4">
          {challenges.map(ch => (
            <div key={ch.id} className="card p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display italic text-lg text-ink-900">"{ch.theme}"</h3>
                  <p className="text-xs font-mono text-ink-300 mt-1">
                    {ch.stories?.[0]?.count ?? 0} historias · {ch.challenge_participants?.[0]?.count ?? 0} participantes
                  </p>
                </div>
                <PhaseBadge phase={ch.phase} />
              </div>

              {/* Progreso de fases */}
              <div className="flex items-center gap-1 mb-4">
                {PHASES_ORDER.map((p, i) => (
                  <div key={p} className="flex items-center gap-1">
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${
                      PHASES_ORDER.indexOf(ch.phase) >= i ? 'bg-ink-700' : 'bg-ink-100'
                    }`} />
                    <span className={`text-[9px] font-mono ${ch.phase === p ? 'text-ink-700' : 'text-ink-200'}`}>
                      {PHASE_LABELS[p].split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Info de fase actual */}
              <div className="bg-ink-50 rounded-sm p-3 mb-4 text-sm font-body text-ink-600">
                <strong className="font-medium">Fase actual:</strong> {PHASE_LABELS[ch.phase]}
                {ch.phase === 'submission' && ' — Los escritores están enviando sus historias.'}
                {ch.phase === 'commenting' && ' — Los participantes deben comentar todas las historias.'}
                {ch.phase === 'voting' && ' — Los participantes que comentaron ya pueden votar.'}
                {ch.phase === 'reveal' && ' — ¡Los resultados están publicados!'}
              </div>

              <div className="flex gap-3 flex-wrap">
                {PHASE_NEXT[ch.phase] && (
                  <button
                    onClick={() => advancePhase(ch)}
                    className="btn-primary text-sm py-2"
                  >
                    Avanzar a: {PHASE_LABELS[PHASE_NEXT[ch.phase]]} →
                  </button>
                )}
                <button
                  onClick={() => navigate(`/challenge/${ch.id}`)}
                  className="btn-secondary text-sm py-2"
                >
                  Ver reto
                </button>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
