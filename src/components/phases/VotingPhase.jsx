import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import StoryFileCard from '../StoryFileCard'

const CATEGORIES = [
  { key: 'best_character', label: '🧑 Mejor personaje', desc: 'La historia con los personajes más memorables' },
  { key: 'best_plot',      label: '📖 Mejor trama',     desc: 'La historia con el argumento más sólido' },
  { key: 'best_opening',   label: '✨ Mejor inicio',    desc: 'La historia con el comienzo más impactante' },
]

export default function VotingPhase({ challenge, stories, myStory, user, participation }) {
  const [myVotes, setMyVotes] = useState({})      // { storyId: points }
  const [myCatVotes, setMyCatVotes] = useState({}) // { category: storyId }
  const [hasCommentedAll, setHasCommentedAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const totalStories = stories.length
  const availablePoints = Array.from({ length: totalStories }, (_, i) => totalStories - i)

  const fetchData = useCallback(async () => {
    const storyIds = stories.map(s => s.id)
    const [{ data: comments }, { data: votes }, { data: catVotes }] = await Promise.all([
      supabase.from('comments').select('story_id').eq('author_id', user.id).in('story_id', storyIds),
      supabase.from('votes').select('*').eq('challenge_id', challenge.id).eq('voter_id', user.id),
      supabase.from('category_votes').select('*').eq('challenge_id', challenge.id).eq('voter_id', user.id),
    ])
    setHasCommentedAll((comments?.length || 0) >= totalStories)
    const voteMap = {}
    votes?.forEach(v => { voteMap[v.story_id] = v.points })
    setMyVotes(voteMap)
    const catMap = {}
    catVotes?.forEach(v => { catMap[v.category] = v.story_id })
    setMyCatVotes(catMap)
    setLoading(false)
  }, [challenge.id, user.id, stories, totalStories])

  useEffect(() => { fetchData() }, [fetchData])

  function assignPoints(storyId, points) {
    setMyVotes(prev => {
      const next = { ...prev }
      const oldOwner = Object.keys(next).find(k => next[k] === points)
      if (oldOwner) delete next[oldOwner]
      if (next[storyId] === points) delete next[storyId]
      else next[storyId] = points
      return next
    })
    setSaved(false)
  }

  function assignCatVote(category, storyId) {
    setMyCatVotes(prev => {
      const next = { ...prev }
      if (next[category] === storyId) delete next[category]
      else next[category] = storyId
      return next
    })
    setSaved(false)
  }

  const pointsUsed = Object.values(myVotes)
  const allPointsAssigned = pointsUsed.length === totalStories &&
    availablePoints.every(p => pointsUsed.includes(p))

  async function saveVotes() {
    if (!allPointsAssigned) return
    setSaving(true)
    try {
      await supabase.from('votes').delete().eq('challenge_id', challenge.id).eq('voter_id', user.id)
      await supabase.from('category_votes').delete().eq('challenge_id', challenge.id).eq('voter_id', user.id)
      const voteRows = Object.entries(myVotes).map(([story_id, points]) => ({
        challenge_id: challenge.id, voter_id: user.id, story_id, points
      }))
      const catRows = Object.entries(myCatVotes).map(([category, story_id]) => ({
        challenge_id: challenge.id, voter_id: user.id, story_id, category
      }))
      await supabase.from('votes').insert(voteRows)
      if (catRows.length > 0) await supabase.from('category_votes').insert(catRows)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (!participation && !myStory) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-xl italic text-ink-400">Votación activa</p>
        <p className="text-sm text-ink-400 mt-2">No participaste en este reto.</p>
      </div>
    )
  }

  if (!hasCommentedAll) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-xl italic text-ink-800 mb-3">Votación bloqueada</p>
        <p className="text-sm text-ink-500">
          Debes comentar <strong>todas</strong> las historias antes de votar.
        </p>
        <p className="text-xs text-ink-300 font-mono mt-2">
          Ve a la sección de comentarios y deja tu opinión en cada historia.
        </p>
      </div>
    )
  }

  if (loading) return (
    <div className="card p-8 text-center">
      <p className="font-mono text-ink-300">Cargando votación...</p>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Instrucciones */}
      <div className="card p-5 border-blue-200 bg-blue-50/40">
        <p className="text-xs font-mono text-blue-700 uppercase tracking-wider mb-2">📊 Cómo votar</p>
        <p className="text-sm text-ink-600 font-body">
          Hay <strong>{totalStories} historias</strong>. Asigna <strong>{totalStories} puntos</strong> a
          tu favorita, <strong>{totalStories - 1}</strong> a la segunda, y así hasta <strong>1 punto</strong>.
          Cada puntaje se usa exactamente una vez.
        </p>
      </div>

      {/* Puntuación principal */}
      <div>
        <h3 className="text-xs font-mono text-ink-500 uppercase tracking-wider mb-4">Puntuación principal</h3>
        <div className="space-y-4">
          {stories.map(story => {
            const assignedPoints = myVotes[story.id]
            const isOwn = story.author_id === user.id

            const pointSelector = (
              <div className="p-4 space-y-2">
                <p className="text-xs font-mono text-ink-400 uppercase tracking-wider">
                  Asigna puntos a esta historia
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availablePoints.map(pts => {
                    const takenBy = Object.keys(myVotes).find(k => myVotes[k] === pts)
                    const isMine = myVotes[story.id] === pts
                    const isTaken = takenBy && takenBy !== story.id
                    return (
                      <button
                        key={pts}
                        onClick={() => assignPoints(story.id, pts)}
                        disabled={isTaken && !isMine}
                        className={`w-9 h-9 text-sm font-mono rounded-sm border transition-all ${
                          isMine
                            ? 'bg-ink-800 text-cream-100 border-ink-800'
                            : isTaken
                            ? 'bg-ink-50 text-ink-200 border-ink-100 cursor-not-allowed'
                            : 'bg-cream-50 text-ink-600 border-ink-200 hover:border-ink-500'
                        }`}
                      >
                        {pts}
                      </button>
                    )
                  })}
                </div>
              </div>
            )

            return (
              <StoryFileCard
                key={story.id}
                story={story}
                isOwn={isOwn}
                badge={assignedPoints ? `${assignedPoints} pts` : undefined}
                badgeColor="bg-ink-800 text-cream-100"
                footer={pointSelector}
              />
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-mono text-ink-300">
          <span>{Object.keys(myVotes).length} / {totalStories} historias puntuadas</span>
          {allPointsAssigned && <span className="text-sage-500">✓ Puntuación completa</span>}
        </div>
      </div>

      {/* Subcategorías */}
      <div>
        <h3 className="text-xs font-mono text-ink-500 uppercase tracking-wider mb-4">
          Menciones especiales <span className="text-ink-300">(opcional)</span>
        </h3>
        <div className="space-y-4">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="card p-4">
              <p className="font-body font-medium text-ink-800 mb-0.5">{cat.label}</p>
              <p className="text-xs text-ink-400 font-body mb-3">{cat.desc}</p>
              <div className="space-y-1.5">
                {stories.map(story => {
                  const selected = myCatVotes[cat.key] === story.id
                  return (
                    <button
                      key={story.id}
                      onClick={() => assignCatVote(cat.key, story.id)}
                      className={`w-full text-left px-3 py-2 rounded-sm text-sm font-body border transition-all ${
                        selected
                          ? 'bg-ink-800 text-cream-100 border-ink-800'
                          : 'bg-cream-50 text-ink-600 border-ink-100 hover:border-ink-300'
                      }`}
                    >
                      {story.title}
                      {story.author_id === user.id && (
                        <span className="ml-2 text-xs opacity-60">(tuya)</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guardar */}
      <div className="sticky bottom-4">
        <button
          onClick={saveVotes}
          disabled={!allPointsAssigned || saving}
          className={`w-full py-4 font-body font-medium text-sm rounded-sm transition-all shadow-lg ${
            saved
              ? 'bg-sage-500 text-white'
              : allPointsAssigned
              ? 'bg-ink-900 text-cream-100 hover:bg-ink-800'
              : 'bg-ink-100 text-ink-300 cursor-not-allowed'
          }`}
        >
          {saving
            ? 'Guardando...'
            : saved
            ? '✓ Votos guardados'
            : allPointsAssigned
            ? 'Guardar votos →'
            : `Faltan ${totalStories - Object.keys(myVotes).length} historias por puntuar`}
        </button>
        {saved && (
          <p className="text-center text-xs font-mono text-ink-400 mt-2">
            Puedes cambiar tus votos hasta que cierre la votación.
          </p>
        )}
      </div>
    </div>
  )
}
