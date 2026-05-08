import { useState } from 'react'
import { openStoryFile } from '../lib/storage'

/**
 * Tarjeta de historia con portada, metadata y botón para abrir el archivo.
 * Se usa en Commenting, Voting y Reveal.
 *
 * Props:
 *   story       — objeto de historia (title, genre, word_count, cover_image_url, file_url, file_type)
 *   badge       — texto opcional encima del título (ej: "🥇", "✓ comentada")
 *   badgeColor  — clase de color para el badge
 *   isOwn       — boolean, si es la propia historia del usuario
 *   showAuthor  — boolean, si se muestra el autor (solo en reveal)
 *   footer      — ReactNode, contenido extra debajo de la tarjeta (ej: form de comentario, selector de puntos)
 *   onClick     — función al hacer clic en el header (para expandir)
 *   expanded    — boolean
 */
export default function StoryFileCard({
  story,
  badge,
  badgeColor = 'bg-ink-100 text-ink-500',
  isOwn = false,
  showAuthor = false,
  footer,
  onClick,
  expanded = false,
}) {
  const [opening, setOpening] = useState(false)

  async function handleOpen(e) {
    e.stopPropagation()
    setOpening(true)
    const ok = await openStoryFile(story.file_url)
    if (!ok) alert('No se pudo abrir el archivo. Intenta de nuevo.')
    setOpening(false)
  }

  const fileLabel = story.file_type === 'pdf' ? 'PDF' : 'Word'
  const fileIcon = story.file_type === 'pdf' ? '📄' : '📝'

  return (
    <div className="card overflow-hidden">
      {/* Portada */}
      {story.cover_image_url ? (
        <div
          className={`relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
          style={{ height: expanded ? '7rem' : '10rem' }}
          onClick={onClick}
        >
          <img
            src={story.cover_image_url}
            alt={story.title}
            className="w-full h-full object-cover transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 to-transparent" />

          {/* Badge encima de la portada */}
          {badge && (
            <div className="absolute top-2 right-2">
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${badgeColor}`}>
                {badge}
              </span>
            </div>
          )}

          {/* Título sobre la portada */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-display italic text-white text-base leading-tight">{story.title}</h3>
            <p className="text-xs font-mono text-white/60 mt-0.5">
              {story.word_count} palabras · {story.genre}
              {isOwn && <span className="ml-2 text-sage-300">(tu historia)</span>}
              {showAuthor && story.profiles?.username && (
                <span className="ml-2 text-amber-300">por {story.profiles.username}</span>
              )}
            </p>
          </div>
        </div>
      ) : (
        /* Sin portada: header normal */
        <div
          className={`p-4 ${onClick ? 'cursor-pointer hover:bg-ink-50/40 transition-colors' : ''}`}
          onClick={onClick}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-display italic text-ink-900 text-base leading-tight">{story.title}</h3>
              <p className="text-xs font-mono text-ink-300 mt-0.5">
                {story.word_count} palabras · {story.genre}
                {isOwn && <span className="ml-2 text-sage-400">(tu historia)</span>}
                {showAuthor && story.profiles?.username && (
                  <span className="ml-2 text-ink-500">por {story.profiles.username}</span>
                )}
              </p>
            </div>
            {badge && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Botón abrir archivo — siempre visible */}
      <div className="px-4 py-2.5 border-t border-ink-100 flex items-center justify-between gap-3">
        <span className="text-xs font-mono text-ink-300">
          {fileIcon} Archivo {fileLabel}
        </span>
        <button
          onClick={handleOpen}
          disabled={opening}
          className="text-xs font-mono text-ink-600 hover:text-ink-900 border border-ink-200 hover:border-ink-400 px-3 py-1 rounded-sm transition-all active:scale-95 disabled:opacity-50"
        >
          {opening ? 'Abriendo...' : `Abrir en ${fileLabel} →`}
        </button>
      </div>

      {/* Footer expandible (comentarios, puntos, etc.) */}
      {footer && (
        <div className="border-t border-ink-100">
          {footer}
        </div>
      )}
    </div>
  )
}
