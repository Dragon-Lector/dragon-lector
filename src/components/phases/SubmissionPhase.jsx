import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const GENRES = ['Drama', 'Misterio', 'Romance', 'Terror', 'Ciencia ficción', 'Fantasía', 'Humor', 'Thriller', 'Otro']
const MAX_FILE_MB = 10
const MAX_COVER_MB = 3
const ACCEPTED_STORY = '.pdf,.doc,.docx'
const ACCEPTED_IMAGE = 'image/jpeg,image/png,image/webp'

function FileIcon({ type }) {
  if (type === 'pdf') return <span className="text-2xl">📄</span>
  return <span className="text-2xl">📝</span>
}

export default function SubmissionPhase({ challenge, myStory, user, onRefresh }) {
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('Drama')
  const [wordCount, setWordCount] = useState('')
  const [storyFile, setStoryFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const storyFileRef = useRef()
  const coverFileRef = useRef()

  // ── Manejo de archivo de historia ────────────────────────
  function handleStoryFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`El archivo no puede superar ${MAX_FILE_MB}MB`)
      return
    }
    setStoryFile(file)
    setError('')
  }

  // ── Manejo de portada ─────────────────────────────────────
  function handleCoverFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_COVER_MB * 1024 * 1024) {
      setError(`La imagen no puede superar ${MAX_COVER_MB}MB`)
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setError('')
  }

  function removeCover() {
    setCoverFile(null)
    setCoverPreview(null)
    if (coverFileRef.current) coverFileRef.current.value = ''
  }

  // ── Subir archivo de historia ─────────────────────────────
  async function uploadStoryFile(storyId) {
    const ext = storyFile.name.split('.').pop().toLowerCase()
    const path = `${user.id}/${storyId}.${ext}`
    setUploadProgress('Subiendo archivo...')
    const { error } = await supabase.storage
      .from('story-files')
      .upload(path, storyFile, { upsert: true, contentType: storyFile.type })
    if (error) throw error
    // Guardamos el path, no la URL directa (se genera URL firmada al leer)
    return { path, fileName: storyFile.name, fileType: ext === 'pdf' ? 'pdf' : 'docx' }
  }

  // ── Subir portada ─────────────────────────────────────────
  async function uploadCover(storyId) {
    if (!coverFile) return null
    const ext = coverFile.name.split('.').pop()
    const path = `${user.id}/${storyId}.${ext}`
    setUploadProgress('Subiendo portada...')
    const { error } = await supabase.storage
      .from('story-covers')
      .upload(path, coverFile, { upsert: true, contentType: coverFile.type })
    if (error) throw error
    const { data } = supabase.storage.from('story-covers').getPublicUrl(path)
    return data.publicUrl
  }

  // ── Enviar ────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!storyFile) { setError('Debes subir tu historia en PDF o Word'); return }
    if (!wordCount || Number(wordCount) <= 0) { setError('Escribe el número de palabras de tu historia'); return }
    if (Number(wordCount) > challenge.max_words) {
      setError(`Tu historia supera el límite de ${challenge.max_words} palabras`)
      return
    }

    setError('')
    setLoading(true)

    try {
      // 1. Registrar como participante
      await supabase.from('challenge_participants').upsert({
        challenge_id: challenge.id,
        user_id: user.id,
        role: 'writer'
      }, { onConflict: 'challenge_id,user_id' })

      // 2. Crear registro de historia para obtener el ID
      setUploadProgress('Registrando historia...')
      const { data: story, error: storyErr } = await supabase
        .from('stories')
        .insert({
          challenge_id: challenge.id,
          author_id: user.id,
          title: title.trim(),
          file_url: 'pending',      // se actualiza después
          file_name: storyFile.name,
          file_type: storyFile.name.split('.').pop().toLowerCase() === 'pdf' ? 'pdf' : 'docx',
          word_count: Number(wordCount),
          genre,
        })
        .select('id')
        .single()
      if (storyErr) throw storyErr

      // 3. Subir archivo de historia
      const { path, fileName, fileType } = await uploadStoryFile(story.id)

      // 4. Subir portada si hay
      const coverUrl = await uploadCover(story.id)

      // 5. Actualizar historia con las URLs reales
      const { error: updateErr } = await supabase
        .from('stories')
        .update({
          file_url: path,
          file_name: fileName,
          file_type: fileType,
          cover_image_url: coverUrl,
        })
        .eq('id', story.id)
      if (updateErr) throw updateErr

      setSuccess(true)
      onRefresh()
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  // ── Historia ya enviada ───────────────────────────────────
  if (myStory) {
    return (
      <div className="space-y-4">
        {myStory.cover_image_url && (
          <div className="rounded-sm overflow-hidden h-40">
            <img src={myStory.cover_image_url} alt="Portada" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="card p-6 border-sage-400/30 bg-sage-400/5">
          <div className="flex items-start gap-3">
            <span className="text-lg">✓</span>
            <div>
              <p className="font-display italic text-lg text-ink-800 mb-1">"{myStory.title}"</p>
              <p className="text-xs font-mono text-ink-400">
                {myStory.word_count} palabras · {myStory.genre} · {myStory.file_type?.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <p className="text-sm font-body text-ink-500 text-center">
            Tu historia está en revisión. Cuando el administrador abra la fase de comentarios,
            podrás leer las demás historias y comentarlas.
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="card p-8 text-center animate-reveal">
        <p className="font-display text-2xl italic text-ink-800 mb-2">¡Historia enviada!</p>
        <p className="text-sm text-ink-400">Espera a que el administrador abra la fase de comentarios.</p>
      </div>
    )
  }

  // ── Formulario ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Reglas */}
      <div className="card p-5 border-blue-200 bg-blue-50/40">
        <p className="text-xs font-mono text-blue-700 uppercase tracking-wider mb-2">📋 Reglas del reto</p>
        <ul className="text-sm text-ink-600 space-y-1 font-body">
          <li>· Máximo <strong>{challenge.max_words} palabras</strong></li>
          <li>· Sube tu historia en <strong>PDF o Word (.docx)</strong></li>
          <li>· Tu historia será publicada de forma <strong>anónima</strong></li>
          <li>· Solo puedes enviar una historia por reto</li>
          <li>· Deberás comentar <strong>todas</strong> las historias para votar</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Portada */}
        <div>
          <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-2">
            Imagen de portada <span className="text-ink-300 normal-case font-body">(opcional · máx. {MAX_COVER_MB}MB)</span>
          </label>
          {coverPreview ? (
            <div className="relative rounded-sm overflow-hidden">
              <img src={coverPreview} alt="Vista previa" className="w-full h-52 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 to-transparent flex items-end p-4">
                <p className="font-display italic text-white text-xl drop-shadow">
                  {title || 'Tu título aquí'}
                </p>
              </div>
              <button
                type="button"
                onClick={removeCover}
                className="absolute top-3 right-3 bg-ink-900/70 text-white text-xs font-mono px-2.5 py-1 rounded-sm hover:bg-scarlet-600 transition-colors"
              >
                ✕ Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverFileRef.current?.click()}
              className="w-full h-36 border border-dashed border-ink-200 rounded-sm flex flex-col items-center justify-center gap-2 text-ink-300 hover:border-ink-400 hover:text-ink-500 transition-colors bg-cream-100/40"
            >
              <span className="text-3xl">🖼</span>
              <span className="text-xs font-mono">Subir imagen de portada</span>
              <span className="text-xs font-mono text-ink-200">JPG · PNG · WEBP</span>
            </button>
          )}
          <input ref={coverFileRef} type="file" accept={ACCEPTED_IMAGE} onChange={handleCoverFile} className="hidden" />
        </div>

        {/* Título */}
        <div>
          <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-2">Título</label>
          <input
            className="input-field"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Un título memorable..."
            required
          />
        </div>

        {/* Género */}
        <div>
          <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-2">Género</label>
          <select className="input-field" value={genre} onChange={e => setGenre(e.target.value)}>
            {GENRES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>

        {/* Número de palabras */}
        <div>
          <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-2">
            Número de palabras <span className="text-ink-300 normal-case font-body">(puedes verlo en Word o Google Docs)</span>
          </label>
          <input
            className="input-field"
            type="number"
            min={1}
            max={challenge.max_words}
            value={wordCount}
            onChange={e => setWordCount(e.target.value)}
            placeholder={`Máximo ${challenge.max_words}`}
            required
          />
          {wordCount && Number(wordCount) > challenge.max_words && (
            <p className="text-xs text-scarlet-500 font-mono mt-1.5">
              Supera el límite de {challenge.max_words} palabras
            </p>
          )}
        </div>

        {/* Archivo de historia */}
        <div>
          <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-2">
            Archivo de tu historia <span className="text-ink-300 normal-case font-body">(PDF o Word · máx. {MAX_FILE_MB}MB)</span>
          </label>
          {storyFile ? (
            <div className="card p-4 flex items-center gap-3">
              <FileIcon type={storyFile.name.split('.').pop().toLowerCase()} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-ink-800 truncate">{storyFile.name}</p>
                <p className="text-xs font-mono text-ink-300">
                  {(storyFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setStoryFile(null); storyFileRef.current.value = '' }}
                className="text-xs font-mono text-scarlet-400 hover:text-scarlet-600 transition-colors shrink-0"
              >
                ✕ Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => storyFileRef.current?.click()}
              className="w-full h-28 border border-dashed border-ink-200 rounded-sm flex flex-col items-center justify-center gap-2 text-ink-300 hover:border-ink-400 hover:text-ink-500 transition-colors bg-cream-100/40"
            >
              <span className="text-3xl">📎</span>
              <span className="text-xs font-mono">Subir archivo .pdf o .docx</span>
            </button>
          )}
          <input
            ref={storyFileRef}
            type="file"
            accept={ACCEPTED_STORY}
            onChange={handleStoryFile}
            className="hidden"
          />
        </div>

        {error && (
          <div className="bg-scarlet-400/10 border border-scarlet-400/30 text-scarlet-600 text-sm px-4 py-3 rounded-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !title || !storyFile || !wordCount}
          className="btn-primary w-full py-3.5"
        >
          {loading ? (uploadProgress || 'Enviando...') : 'Enviar historia de forma anónima →'}
        </button>
      </form>
    </div>
  )
}
