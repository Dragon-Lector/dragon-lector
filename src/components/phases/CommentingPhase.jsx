import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import StoryFileCard from '../StoryFileCard'

function CommentFooter({ story, userId, onCommentSaved }) {
  const [comment, setComment] = useState('')
  const [myComment, setMyComment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const isOwn = story.author_id === userId

  useEffect(() => { fetchMyComment() }, [])

  async function fetchMyComment() {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('story_id', story.id)
      .eq('author_id', userId)
      .single()
    setMyComment(data)
    setFetching(false)
  }

  async function submitComment(e) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('comments').insert({
      story_id: story.id,
      author_id: userId,
      content: comment.trim()
    }).select().single()
    if (!error) {
      setMyComment(data)
      setComment('')
      onCommentSaved()
    }
    setLoading(false)
  }

  if (fetching) return (
    <div className="px-4 py-3">
      <p className="text-xs font-mono text-ink-300">Cargando...</p>
    </div>
  )

  if (myComment) return (
    <div className="px-4 py-3">
      <p className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-1.5">Tu comentario</p>
      <p className="text-sm font-body text-ink-600 italic border-l-2 border-amber-300 pl-3 bg-amber-50/40 py-1.5">
        "{myComment.content}"
      </p>
    </div>
  )

  return (
    <form onSubmit={submitComment} className="p-4 space-y-2">
      <p className="text-xs font-mono text-ink-400 uppercase tracking-wider">
        {isOwn
          ? 'Comenta tu propia historia (sin revelar que es tuya)'
          : 'Deja tu comentario — ábrela primero para leerla'}
      </p>
      <textarea
        className="input-field min-h-[72px] resize-none text-sm"
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Comparte tu opinión..."
        required
      />
      <button
        type="submit"
        disabled={loading || !comment.trim()}
        className="btn-primary text-sm py-2"
      >
        {loading ? 'Guardando...' : 'Publicar comentario'}
      </button>
    </form>
  )
}

export default function CommentingPhase({ challenge, stories, myStory, user, participation }) {
  const [commentedCount, setCommentedCount] = useState(0)
  const [commentStatus, setCommentStatus] = useState({}) // { storyId: true/false }

  useEffect(() => { fetchCommentStatus() }, [])

  async function fetchCommentStatus() {
    const { data } = await supabase
      .from('comments')
      .select('story_id')
      .eq('author_id', user.id)
      .in('story_id', stories.map(s => s.id))
    const map = {}
    data?.forEach(c => { map[c.story_id] = true })
    setCommentStatus(map)
    setCommentedCount(data?.length || 0)
  }

  const total = stories.length
  const allCommented = commentedCount >= total && total > 0

  if (!participation && !myStory) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-xl italic text-ink-400 mb-2">Fase de comentarios</p>
        <p className="text-sm text-ink-400">Solo pueden comentar quienes se inscribieron en este reto.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Progreso */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono text-ink-500 uppercase tracking-wider">Tu progreso</p>
          <span className={`text-xs font-mono ${allCommented ? 'text-sage-500' : 'text-amber-600'}`}>
            {commentedCount} / {total} comentadas
          </span>
        </div>
        <div className="w-full bg-ink-100 rounded-full h-1.5 mb-2">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${allCommented ? 'bg-sage-500' : 'bg-amber-400'}`}
            style={{ width: `${total > 0 ? (commentedCount / total) * 100 : 0}%` }}
          />
        </div>
        <p className={`text-xs font-mono ${allCommented ? 'text-sage-600' : 'text-ink-400'}`}>
          {allCommented
            ? '✓ ¡Listo! Podrás votar cuando el administrador abra esa fase.'
            : 'Abre cada historia, léela y deja tu comentario para desbloquear la votación.'}
        </p>
      </div>

      {/* Historias */}
      <div className="space-y-3">
        {stories.map(story => (
          <StoryFileCard
            key={story.id}
            story={story}
            isOwn={story.author_id === user.id}
            badge={commentStatus[story.id] ? '✓ comentada' : undefined}
            badgeColor="bg-sage-400/80 text-white"
            footer={
              <CommentFooter
                story={story}
                userId={user.id}
                onCommentSaved={fetchCommentStatus}
              />
            }
          />
        ))}
      </div>
    </div>
  )
}
