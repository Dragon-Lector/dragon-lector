import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'

const DEFAULT_CONFIG = {
  app: {
    titulo: "Ruleta literaria",
    subtitulo: "Genera el reto mensual del club",
    idioma_prompt: "español"
  },
  categorias: [
    {
      id: "genero",
      label: "Género",
      icono: "📚",
      valores: [
        "Terror psicológico","Romance oscuro","Ciencia ficción",
        "Suspenso","Fantasía épica","Realismo mágico",
        "Distopía","Thriller político","Fábula moderna","Comedia negra"
      ]
    },
    {
      id: "narrador",
      label: "Narrador",
      icono: "🗣️",
      valores: [
        "Primera persona","Tercera omnisciente","Segunda persona",
        "Narrador no confiable","Múltiples voces","Narrador colectivo"
      ]
    },
    {
      id: "elemento",
      label: "Elemento",
      icono: "✨",
      valores: [
        "Un espejo roto","Una carta sin destinatario","Un reloj detenido",
        "Una llave sin cerradura","Un libro prohibido","Una fotografía antigua",
        "Un mapa incompleto","Una vela que nunca se apaga","Una puerta que nadie usa"
      ]
    }
  ],
  modos: [
    {
      id: "aleatorio",
      icono: "🎲",
      nombre: "Aleatorio total",
      descripcion: "La ruleta elige todo. Nadie sabe qué tocará.",
      categorias_fijas: []
    },
    {
      id: "mixto",
      icono: "🔀",
      nombre: "Mixto",
      descripcion: "Una categoría fija elegida por el grupo + el resto aleatorio.",
      categorias_fijas: ["genero"]
    },
    {
      id: "rotacion",
      icono: "🔄",
      nombre: "Rotación de dueños",
      descripcion: "Cada mes un miembro elige el género y el resto es aleatorio.",
      categorias_fijas: ["genero"]
    }
  ],
  ia: {
    habilitada: true,
    modelo: "claude-sonnet-4-20250514",
    prompt_template: "Eres el asistente de un club de escritura creativo. Genera un prompt de escritura inspirador y detallado (3-4 oraciones) usando estos elementos:\n{{categorias}}\n\nEl prompt debe ser concreto, sugerente y dejar espacio a la imaginación. Escríbelo directamente, sin introducción. Responde en {{idioma}}."
  }
}

const CONFIG_STORAGE_KEY = 'ruleta_config_v1'
const HISTORIAL_STORAGE_KEY = 'ruleta_historial_v1'

const rand = arr => arr[Math.floor(Math.random() * arr.length)]
const getMes = () => {
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
  const d = new Date()
  return `${meses[d.getMonth()]} ${d.getFullYear()}`
}

// ── Subcomponente: editor de una categoría ──────────────────────────────────
function CategoriaEditor({ cat, onChange, onDelete }) {
  const [nuevoValor, setNuevoValor] = useState('')

  function agregarValor() {
    const v = nuevoValor.trim()
    if (!v || cat.valores.includes(v)) return
    onChange({ ...cat, valores: [...cat.valores, v] })
    setNuevoValor('')
  }

  function eliminarValor(val) {
    onChange({ ...cat, valores: cat.valores.filter(v => v !== val) })
  }

  function editarLabel(e) {
    onChange({ ...cat, label: e.target.value })
  }

  return (
    <div className="card p-5 mb-4">
      {/* Header de la categoría */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{cat.icono}</span>
          <input
            className="input-field py-1.5 text-sm font-medium flex-1"
            value={cat.label}
            onChange={editarLabel}
            placeholder="Nombre de categoría"
          />
        </div>
        <button
          onClick={onDelete}
          className="text-xs font-mono text-scarlet-400 hover:text-scarlet-600 transition-colors px-2 py-1"
        >
          ✕ eliminar
        </button>
      </div>

      {/* Valores actuales */}
      <div className="flex flex-wrap gap-2 mb-3">
        {cat.valores.map(v => (
          <div key={v} className="flex items-center gap-1 bg-ink-50 border border-ink-100 rounded-sm px-2.5 py-1">
            <span className="text-xs font-body text-ink-700">{v}</span>
            <button
              onClick={() => eliminarValor(v)}
              className="text-ink-300 hover:text-scarlet-500 transition-colors ml-1 text-xs leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Agregar valor */}
      <div className="flex gap-2">
        <input
          className="input-field py-1.5 text-sm flex-1"
          value={nuevoValor}
          onChange={e => setNuevoValor(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregarValor()}
          placeholder="Nuevo valor... (Enter para agregar)"
        />
        <button
          onClick={agregarValor}
          disabled={!nuevoValor.trim()}
          className="btn-secondary text-sm py-1.5 px-4 shrink-0"
        >
          + Agregar
        </button>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function RuletaPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('ruleta')
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG
    } catch { return DEFAULT_CONFIG }
  })
  const [historial, setHistorial] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORIAL_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [seleccion, setSeleccion] = useState({})
  const [spinning, setSpinning] = useState(false)
  const [resultado, setResultado] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [modoActivo, setModoActivo] = useState(config.modos?.[0]?.id || 'aleatorio')
  const [fijas, setFijas] = useState({})
  const [saveIndicator, setSaveIndicator] = useState(false)
  const spinRef = useRef(null)

  // Nuevo valor para agregar categoría
  const [nuevaCatNombre, setNuevaCatNombre] = useState('')

  // Persistir config en localStorage
  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  }, [config])

  useEffect(() => {
    localStorage.setItem(HISTORIAL_STORAGE_KEY, JSON.stringify(historial))
  }, [historial])

  const getModoActivo = () => config.modos?.find(m => m.id === modoActivo)

  function girar() {
    if (spinning) return
    setSpinning(true)
    setResultado('')
    const modo = getModoActivo()
    const fijadas = modo?.categorias_fijas || []
    let t = 0

    spinRef.current = setInterval(() => {
      const tmp = {}
      config.categorias.forEach(c => {
        tmp[c.id] = fijadas.includes(c.id) && fijas[c.id] ? fijas[c.id] : rand(c.valores)
      })
      setSeleccion(tmp)
      t++
      if (t > 20) {
        clearInterval(spinRef.current)
        const final = {}
        config.categorias.forEach(c => {
          final[c.id] = fijadas.includes(c.id) && fijas[c.id] ? fijas[c.id] : rand(c.valores)
        })
        setSeleccion(final)
        setSpinning(false)
        const desc = config.categorias.map(c => `${c.label}: ${final[c.id]}`).join(' · ')
        setResultado(`Reto: ${desc}`)
        const entrada = { mes: getMes(), data: final, timestamp: Date.now() }
        setHistorial(h => [entrada, ...h].slice(0, 6))
      }
    }, 80)
  }

  async function generarIA() {
    if (!config.ia?.habilitada || !Object.keys(seleccion).length) return
    setLoadingIA(true)
    const categoriasStr = config.categorias.map(c => `- ${c.label}: ${seleccion[c.id]}`).join('\n')
    const prompt = config.ia.prompt_template
      .replace('{{categorias}}', categoriasStr)
      .replace('{{idioma}}', config.app.idioma_prompt || 'español')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ia.modelo || 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      setResultado(data.content?.find(b => b.type === 'text')?.text || 'Sin respuesta.')
    } catch {
      setResultado('Error al conectar con la IA.')
    }
    setLoadingIA(false)
  }

  function resetConfig() {
    if (confirm('¿Resetear toda la configuración a los valores por defecto?')) {
      setConfig(DEFAULT_CONFIG)
      setModoActivo(DEFAULT_CONFIG.modos[0].id)
      setSeleccion({})
      setResultado('')
    }
  }

  function actualizarCategoria(idx, nueva) {
    setConfig(c => {
      const cats = [...c.categorias]
      cats[idx] = nueva
      return { ...c, categorias: cats }
    })
    indicarGuardado()
  }

  function eliminarCategoria(idx) {
    if (config.categorias.length <= 1) return
    setConfig(c => ({ ...c, categorias: c.categorias.filter((_, i) => i !== idx) }))
    indicarGuardado()
  }

  function agregarCategoria() {
    const nombre = nuevaCatNombre.trim()
    if (!nombre) return
    const id = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (config.categorias.find(c => c.id === id)) return
    setConfig(c => ({
      ...c,
      categorias: [...c.categorias, {
        id,
        label: nombre,
        icono: '📝',
        valores: ['Valor 1', 'Valor 2', 'Valor 3']
      }]
    }))
    setNuevaCatNombre('')
    indicarGuardado()
  }

  function indicarGuardado() {
    setSaveIndicator(true)
    setTimeout(() => setSaveIndicator(false), 2000)
  }

  const modo = getModoActivo()
  const tieneSeleccion = Object.keys(seleccion).length > 0

  const TABS = [
    { id: 'ruleta', label: '🎲 Girar' },
    { id: 'modos', label: '⚙️ Modo' },
    { id: 'categorias', label: '📋 Categorías' },
  ]

  return (
    <div className="min-h-screen paper-bg">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={() => navigate('/')}
            className="text-xs font-mono text-ink-300 hover:text-ink-600 transition-colors mb-4 block"
          >
            ← Volver al inicio
          </button>
          <p className="font-mono text-xs text-ink-400 uppercase tracking-[0.25em] mb-2">
            ✦ Herramienta
          </p>
          <h2 className="font-display text-3xl text-ink-900 italic">
            {config.app.titulo}
          </h2>
          <p className="text-ink-400 font-body mt-1 text-sm">{config.app.subtitulo}</p>
          <div className="w-12 h-px bg-ink-300 mt-4" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-ink-100 pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-body transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-ink-800 text-ink-900 font-medium'
                  : 'border-transparent text-ink-400 hover:text-ink-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: RULETA ───────────────────────────────────────── */}
        {tab === 'ruleta' && (
          <div className="animate-slide-up space-y-5">
            {/* Modo activo */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-ink-300 bg-ink-50 border border-ink-100 px-2.5 py-1 rounded-full">
                {getMes()}
              </span>
              <span className="text-xs font-mono text-ink-400">
                {modo?.icono} {modo?.nombre}
              </span>
            </div>

            {/* Selects para valores fijos */}
            {modo?.categorias_fijas?.length > 0 && (
              <div className="card p-4 space-y-3">
                <p className="text-xs font-mono text-ink-500 uppercase tracking-wider">
                  Valores fijos para este modo
                </p>
                {config.categorias
                  .filter(c => modo.categorias_fijas.includes(c.id))
                  .map(c => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-sm text-ink-500 min-w-[80px] font-body">
                        {c.icono} {c.label}
                      </span>
                      <select
                        className="input-field py-1.5 text-sm"
                        value={fijas[c.id] || ''}
                        onChange={e => setFijas(f => ({ ...f, [c.id]: e.target.value }))}
                      >
                        <option value="">— aleatorio —</option>
                        {c.valores.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  ))}
              </div>
            )}

            {/* Tarjetas de categorías */}
            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min(config.categorias.length, 3)}, 1fr)` }}>
              {config.categorias.map(c => (
                <div key={c.id} className="card p-4">
                  <p className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-2">
                    {c.icono} {c.label}
                  </p>
                  <p className={`font-display italic text-base leading-tight transition-all duration-100 ${
                    spinning ? 'text-ink-300' : 'text-ink-900'
                  }`}>
                    {seleccion[c.id] || '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* Resultado / Prompt */}
            <div className="card p-5 min-h-[80px]">
              <p className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-2">
                Prompt del reto
              </p>
              <p className={`font-body text-sm leading-relaxed ${
                resultado ? 'text-ink-800' : 'text-ink-300 italic'
              }`}>
                {resultado || 'Gira la ruleta para generar el reto...'}
              </p>
            </div>

            {/* Botones */}
            <button
              onClick={girar}
              disabled={spinning}
              className="btn-primary w-full text-base py-3.5"
            >
              {spinning ? 'Girando...' : '🎲 Girar ruleta'}
            </button>

            {config.ia?.habilitada && (
              <button
                onClick={generarIA}
                disabled={!tieneSeleccion || loadingIA || spinning}
                className="btn-secondary w-full text-sm"
              >
                {loadingIA ? '✦ Generando con IA...' : '✦ Generar descripción con IA'}
              </button>
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-3">
                  Retos anteriores
                </p>
                <div className="space-y-2">
                  {historial.map((h, i) => (
                    <div key={i} className="card px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-body text-ink-600">
                        {config.categorias.map(c => h.data[c.id]).filter(Boolean).join(' · ')}
                      </span>
                      <span className="text-xs font-mono text-ink-300 shrink-0">{h.mes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: MODOS ────────────────────────────────────────── */}
        {tab === 'modos' && (
          <div className="animate-slide-up space-y-3">
            <p className="text-sm font-body text-ink-500 mb-4">
              ¿Cómo quieren elegir el tema cada mes?
            </p>
            {config.modos.map(m => (
              <div
                key={m.id}
                onClick={() => setModoActivo(m.id)}
                className={`card p-5 flex items-start gap-4 cursor-pointer transition-all ${
                  modoActivo === m.id
                    ? 'border-ink-400 bg-ink-50/50'
                    : 'hover:border-ink-200'
                }`}
              >
                <span className="text-2xl shrink-0">{m.icono}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-body font-medium text-ink-800">{m.nombre}</p>
                    {modoActivo === m.id && (
                      <span className="text-xs font-mono text-sage-500 bg-sage-400/10 px-2 py-0.5 rounded-full">
                        activo
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-body text-ink-500 mt-1">{m.descripcion}</p>
                  {m.categorias_fijas?.length > 0 && (
                    <p className="text-xs font-mono text-ink-300 mt-2">
                      Fijas: {m.categorias_fijas.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: CATEGORÍAS ───────────────────────────────────── */}
        {tab === 'categorias' && (
          <div className="animate-slide-up">
            {/* Indicador de autoguardado */}
            <div className={`flex items-center justify-between mb-5 transition-opacity ${saveIndicator ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-xs font-mono text-sage-500">✓ Guardado automáticamente</span>
            </div>

            <p className="text-sm font-body text-ink-500 mb-5">
              Edita las categorías y sus posibles valores. Los cambios se guardan automáticamente en tu navegador.
            </p>

            {/* Editor de cada categoría */}
            {config.categorias.map((cat, idx) => (
              <CategoriaEditor
                key={cat.id}
                cat={cat}
                onChange={nueva => { actualizarCategoria(idx, nueva); indicarGuardado() }}
                onDelete={() => eliminarCategoria(idx)}
              />
            ))}

            {/* Agregar nueva categoría */}
            <div className="card p-5 border-dashed mb-6">
              <p className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-3">
                + Nueva categoría
              </p>
              <div className="flex gap-2">
                <input
                  className="input-field py-1.5 text-sm flex-1"
                  value={nuevaCatNombre}
                  onChange={e => setNuevaCatNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && agregarCategoria()}
                  placeholder='Ej: "Época", "Conflicto", "Tono"...'
                />
                <button
                  onClick={agregarCategoria}
                  disabled={!nuevaCatNombre.trim()}
                  className="btn-primary text-sm py-1.5 px-4 shrink-0"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Reset */}
            <div className="border-t border-ink-100 pt-5">
              <button
                onClick={resetConfig}
                className="text-xs font-mono text-scarlet-400 hover:text-scarlet-600 transition-colors"
              >
                ↺ Resetear todo a los valores por defecto
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
