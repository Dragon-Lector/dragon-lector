import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createLogger } from '../lib/logger'

const log = createLogger('auth')

const AuthContext = createContext(null)

// Dominio sintético: el usuario nunca lo ve. Solo existe para que Supabase
// Auth pueda usar su flujo interno (que requiere "email").
const AUTH_DOMAIN = 'dragonlector.local'

// Normaliza el username a un formato estable y compatible con email local-part
function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    // permite letras, números, punto, guion y guion bajo
    .replace(/[^a-z0-9._-]/g, '')
}

function usernameToEmail(username) {
  return `${normalizeUsername(username)}@${AUTH_DOMAIN}`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    log.debug('AuthProvider montado, recuperando sesión...')
    supabase.auth.getSession().then(({ data: { session } }) => {
      log.info('sesión inicial', session?.user ? `userId=${session.user.id}` : 'sin sesión')
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      log.info('auth state change', event, session?.user ? `userId=${session.user.id}` : '(no user)')
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => {
      log.debug('AuthProvider desmontado, cerrando subscription')
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    log.debug('fetchProfile', userId)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) log.warn('fetchProfile error', error.message)
    else log.debug('perfil cargado', data)
    setProfile(data)
    setLoading(false)
  }

  async function signUp(username, password) {
    const cleanUsername = normalizeUsername(username)
    log.info('signUp', { username: cleanUsername })

    if (cleanUsername.length < 3) {
      throw new Error('El nombre de usuario debe tener al menos 3 caracteres')
    }
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres')
    }

    // Verifica disponibilidad antes de crear el usuario en auth
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existing) {
      log.warn('signUp: username ya en uso', cleanUsername)
      throw new Error('Ese nombre de usuario ya está en uso')
    }

    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(cleanUsername),
      password,
      options: {
        data: { username: cleanUsername },
      },
    })

    if (error) {
      log.error('signUp error', error.message)
      if (error.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Demasiados intentos. Espera unos minutos antes de intentar de nuevo.')
      }
      if (error.message?.toLowerCase().includes('already registered')) {
        throw new Error('Ese nombre de usuario ya está en uso')
      }
      throw error
    }

    log.debug('signUp ok', { hasSession: !!data.session, userId: data.user?.id })

    // Si por algún motivo no hay sesión (p.ej. confirmación de email aún activa),
    // intentamos iniciar sesión de inmediato.
    if (!data.session) {
      log.info('signUp sin sesión, intentando signIn automático')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(cleanUsername),
        password,
      })
      if (signInError) {
        log.error('signIn automático tras signUp falló', signInError.message)
        throw signInError
      }
    }

    return data
  }

  async function signIn(username, password) {
    const cleanUsername = normalizeUsername(username)
    log.info('signIn', { username: cleanUsername })
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(cleanUsername),
      password,
    })
    if (error) {
      log.warn('signIn error', error.message)
      if (error.message?.toLowerCase().includes('invalid login')) {
        throw new Error('Usuario o contraseña incorrectos')
      }
      throw error
    }
    log.debug('signIn ok', { userId: data.user?.id })
    return data
  }

  async function signOut() {
    log.info('signOut')
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
