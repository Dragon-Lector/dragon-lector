import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import StoryFileCard from '../StoryFileCard'

const CAT_LABELS = {
  best_character: '🧑 Mejor personaje',
  best_plot:      '📖 Mejor trama',
  best_opening:   '✨ Mejor inicio',
}

export default function RevealPhase({ challenge, stories }) {
  const [results, setResults] = useState([])
  const [categoryWinners, setCategoryWinners] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchResults() }, [])

  async function fetchResults() {
    const storyIds = stories.map(s => s.id)
    const [{ data: votes }, { data: catVotes }, { data: comments }] = await Promise.all([
      supabase.from('votes').select('story_id, points').in('story_id', storyIds),
      supabase.from('category_votes').select('story_id, category').in('story_id', storyIds),
      supabase.from('comments').select('story_id, content, profiles(username)').in('story_id', storyIds),
    ])

    const pointsMap = {}
    votes?.forEach(v => { pointsMap[v.story_id] = (pointsMap[v.story_id] || 0) + v.points })

    const catCount = {}
    catVotes?.forEach(v => {
      if (!catCount[v.category]) catCount[v.category] = {}
      catCount[v.category][v.story_id] = (catCount[v.category][v.story_id] || 0) + 1
    })
    const catWinners = {}
    Object.keys(catCount).forEach(cat => {
      const sorted = Object.entries(catCount[cat]).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) catWinners[cat] = sorted[0][0]
    })
    setCategoryWinners(catWinners)

    const commentsMap = {}
    comments?.forEach(c => {
      if (!commentsMap[c.story_id]) commentsMap[c.story_id] = []
      commentsMap[c.story_id].push(c)
    })

    const ranked = [...stories]
      .map(s => ({ ...s, totalPoints: pointsMap[s.id] || 0, storyComments: commentsMap[s.id] || [] }))
      .sort((a, b) => b.totalPoints - a.totalPoints)

    setResults(ranked)
    setLoading(false)
  }

  if (loading) return (
    <div className="card p-8 text-center">
      <p className="font-mono text-ink-300">Calculando resultados...</p>
    </div>
  )

  const medals = ['🥇', '🥈', '🥉']
  const maxPoints = results[0]?.totalPoints || 1

  return (
    <div className="space-y-6 animate-reveal">
      {/* Encabezado */}
      <div className="text-center py-4">
        <p className="font-mono text-xs text-ink-400 uppercase tracking-[0.3em] mb-2">✦ Se revela el misterio ✦</p>
        <h3 className="font-display text-2xl italic text-ink-900">Resultados finales</h3>
      </div>

      {/* Ranking */}
      <div className="space-y-4">
        {results.map((story, idx) => {
          const medal = medals[idx] || `${idx + 1}.`
          const catWins = Object.entries(categoryWinners)
            .filter(([, sId]) => sId === story.id)
            .map(([cat]) => CAT_LABELS[cat])

          const resultFooter = (
            <div className="p-4 space-y-3">
              {/* Puntos y barra */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 bg-ink-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${idx === 0 ? 'bg-amber-400' : 'bg-ink-500'}`}
                    style={{ width: `${(story.totalPoints / maxPoints) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-sm font-medium text-ink-700 shrink-0">
                  {story.totalPoints} pts
                </span>
              </div>

              {/* Premios de subcategoría */}
              {catWins.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {catWins.map(w => (
                    <span key={w} className="text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      {w}
                    </span>
                  ))}
                </div>
              )}

              {/* Comentarios */}
              {story.storyComments.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-ink-100">
                  <p className="text-xs font-mono text-ink-400 uppercase tracking-wider">
                    Comentarios ({story.storyComments.length})
                  </p>
                  {story.storyComments.map((c, i) => (
                    <div key={i} className="border-l-2 border-ink-200 pl-3">
                      <p className="text-xs font-mono text-ink-400 mb-0.5">{c.profiles?.username}</p>
                      <p className="text-sm font-body text-ink-600 italic">"{c.content}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )

          return (
            <div key={story.id} className={idx === 0 ? 'ring-1 ring-amber-300 rounded-sm' : ''}>
              <StoryFileCard
                story={story}
                showAuthor={true}
                badge={`${medal} ${story.profiles?.username || 'Anónimo'}`}
                badgeColor={idx === 0 ? 'bg-amber-400/90 text-amber-900' : 'bg-ink-700/80 text-white'}
                footer={resultFooter}
              />
            </div>
          )
        })}
      </div>

      {/* Menciones especiales */}
      {Object.keys(categoryWinners).length > 0 && (
        <div>
          <p className="text-xs font-mono text-ink-500 uppercase tracking-wider mb-3">Menciones especiales</p>
          <div className="space-y-2">
            {Object.entries(categoryWinners).map(([cat, storyId]) => {
              const winner = results.find(s => s.id === storyId)
              return winner ? (
                <div key={cat} className="card p-4 flex items-center gap-3">
                  {winner.cover_image_url && (
                    <img src={winner.cover_image_url} alt="" className="w-12 h-12 object-cover rounded-sm shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-ink-400">{CAT_LABELS[cat]}</p>
                    <p className="font-display italic text-ink-800 truncate">{winner.title}</p>
                  </div>
                  <p className="text-sm font-body text-ink-500 shrink-0">{winner.profiles?.username}</p>
                </div>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
