import { supabase } from './supabase'

/**
 * Genera una URL firmada temporal (1 hora) para un archivo de historia.
 * Los archivos en story-files son privados, así que no tienen URL pública.
 */
export async function getStoryFileUrl(filePath) {
  if (!filePath || filePath === 'pending') return null
  const { data, error } = await supabase.storage
    .from('story-files')
    .createSignedUrl(filePath, 60 * 60) // 1 hora de validez
  if (error) return null
  return data.signedUrl
}

/**
 * Abre el archivo de una historia en una nueva pestaña.
 * Genera la URL firmada y la abre directamente.
 */
export async function openStoryFile(filePath) {
  const url = await getStoryFileUrl(filePath)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
