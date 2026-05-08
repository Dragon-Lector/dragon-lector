import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signUp(username, password) {
    const cleanUsername = normalizeUsername(username)

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
      if (error.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Demasiados intentos. Espera unos minutos antes de intentar de nuevo.')
      }
      if (error.message?.toLowerCase().includes('already registered')) {
        throw new Error('Ese nombre de usuario ya está en uso')
      }
      throw error
    }

    // Si por algún motivo no hay sesión (p.ej. confirmación de email aún activa),
    // intentamos iniciar sesión de inmediato.
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(cleanUsername),
        password,
      })
      if (signInError) throw signInError
    }

    return data
  }

  async function signIn(username, password) {
    const cleanUsername = normalizeUsername(username)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(cleanUsername),
      password,
    })
    if (error) {
      if (error.message?.toLowerCase().includes('invalid login')) {
        throw new Error('Usuario o contraseña incorrectos')
      }
      throw error
    }
    return data
  }

  async function signOut() {
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
