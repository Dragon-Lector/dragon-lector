import { supabase } from './supabase'
import { createLogger } from './logger'

const log = createLogger('storage')

/**
 * Genera una URL firmada temporal (1 hora) para un archivo de historia.
 * Los archivos en story-files son privados, así que no tienen URL pública.
 */
export async function getStoryFileUrl(filePath) {
  if (!filePath || filePath === 'pending') {
    log.debug('getStoryFileUrl: filePath vacío o pending', filePath)
    return null
  }
  log.debug('getStoryFileUrl: solicitando URL firmada', filePath)
  const { data, error } = await supabase.storage
    .from('story-files')
    .createSignedUrl(filePath, 60 * 60) // 1 hora de validez
  if (error) {
    log.error('getStoryFileUrl error', error.message, filePath)
    return null
  }
  log.debug('getStoryFileUrl ok')
  return data.signedUrl
}

/**
 * Abre el archivo de una historia en una nueva pestaña.
 * Genera la URL firmada y la abre directamente.
 */
export async function openStoryFile(filePath) {
  log.info('openStoryFile', filePath)
  const url = await getStoryFileUrl(filePath)
  if (!url) {
    log.warn('openStoryFile: no se pudo obtener URL para', filePath)
    return false
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
