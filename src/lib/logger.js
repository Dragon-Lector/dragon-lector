/**
 * Sistema de logging configurable.
 *
 * Niveles (de menor a mayor severidad):
 *   silent < debug < info < warn < error
 *
 * El logger imprime un mensaje si su nivel >= nivel configurado.
 * Ejemplo: con nivel "info", se ven info/warn/error pero NO debug.
 *
 * Configuración (en orden de prioridad):
 *   1. localStorage.setItem('log_level', 'debug')   // runtime, persistente
 *   2. import.meta.env.VITE_LOG_LEVEL                // build time
 *   3. 'debug' en dev, 'warn' en prod                // por defecto
 *
 * Uso:
 *   import { createLogger } from '@/lib/logger'
 *   const log = createLogger('auth')
 *   log.debug('signing in', { username })
 *   log.info('session established')
 *   log.warn('retrying...')
 *   log.error('failed', err)
 *
 * Cambiar el nivel en runtime desde la consola del navegador:
 *   __log.setLevel('debug')   // o 'info', 'warn', 'error', 'silent'
 *   __log.getLevel()
 *   __log.reset()             // vuelve al default
 */

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 }
const STORAGE_KEY = 'log_level'

const COLORS = {
  debug: 'color:#7280a8;font-weight:600',
  info:  'color:#3b82f6;font-weight:600',
  warn:  'color:#d97706;font-weight:600',
  error: 'color:#dc2626;font-weight:700',
}

const SCOPE_STYLE = 'color:#9ca3af;font-weight:500'

function readEnvLevel() {
  try {
    const fromEnv = import.meta.env?.VITE_LOG_LEVEL
    if (fromEnv && LEVELS[fromEnv] !== undefined) return fromEnv
  } catch {}
  // En dev por defecto debug, en prod warn
  try {
    return import.meta.env?.DEV ? 'debug' : 'warn'
  } catch {
    return 'warn'
  }
}

function readStoredLevel() {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (v && LEVELS[v] !== undefined) return v
  } catch {}
  return null
}

let currentLevel = readStoredLevel() ?? readEnvLevel()

function shouldLog(level) {
  return LEVELS[level] <= LEVELS[currentLevel]
}

function timestamp() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

function emit(level, scope, args) {
  if (!shouldLog(level)) return
  const fn = level === 'debug' ? console.debug
    : level === 'info'  ? console.info
    : level === 'warn'  ? console.warn
    : console.error

  const tag = `%c${timestamp()} %c${level.toUpperCase().padEnd(5)} %c[${scope}]`
  fn(tag, 'color:#6b7280', COLORS[level], SCOPE_STYLE, ...args)
}

export function createLogger(scope = 'app') {
  return {
    debug: (...args) => emit('debug', scope, args),
    info:  (...args) => emit('info',  scope, args),
    warn:  (...args) => emit('warn',  scope, args),
    error: (...args) => emit('error', scope, args),
    /** Crea un sub-logger anidado. createLogger('auth').child('signup') -> [auth:signup] */
    child: (sub) => createLogger(`${scope}:${sub}`),
  }
}

export const logger = createLogger('app')

export function setLevel(level) {
  if (LEVELS[level] === undefined) {
    console.warn(`[logger] nivel inválido: "${level}". Usa: ${Object.keys(LEVELS).join(', ')}`)
    return
  }
  currentLevel = level
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, level)
  } catch {}
  console.info(`%c[logger] nivel cambiado a "${level}"`, 'color:#10b981;font-weight:600')
}

export function getLevel() {
  return currentLevel
}

export function resetLevel() {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
  currentLevel = readEnvLevel()
  console.info(`%c[logger] nivel restablecido a "${currentLevel}"`, 'color:#10b981;font-weight:600')
}

// Expone helpers en window para tweakear desde la consola del navegador
if (typeof window !== 'undefined') {
  window.__log = {
    setLevel,
    getLevel,
    reset: resetLevel,
    levels: Object.keys(LEVELS),
  }
}
