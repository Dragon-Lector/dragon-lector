const PHASES = {
  submission: { label: 'Envío de historias', color: 'bg-blue-100 text-blue-800', dot: '🖊' },
  commenting: { label: 'Comentando', color: 'bg-amber-100 text-amber-800', dot: '💬' },
  voting: { label: 'Votación abierta', color: 'bg-sage-400/20 text-sage-600', dot: '🗳' },
  reveal: { label: 'Resultados', color: 'bg-scarlet-400/20 text-scarlet-600', dot: '✨' },
}

export default function PhaseBadge({ phase }) {
  const p = PHASES[phase] || PHASES.submission
  return (
    <span className={`phase-badge ${p.color}`}>
      <span>{p.dot}</span>
      {p.label}
    </span>
  )
}

export function PhaseSteps({ current }) {
  const steps = [
    { key: 'submission', label: 'Envío' },
    { key: 'commenting', label: 'Comentarios' },
    { key: 'voting', label: 'Votación' },
    { key: 'reveal', label: 'Resultados' },
  ]
  const currentIdx = steps.findIndex(s => s.key === current)

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={`flex flex-col items-center`}>
            <div className={`w-2 h-2 rounded-full transition-colors ${
              i < currentIdx ? 'bg-ink-500' :
              i === currentIdx ? 'bg-ink-900' :
              'bg-ink-200'
            }`} />
            <span className={`text-[10px] font-mono mt-1 ${
              i === currentIdx ? 'text-ink-800' : 'text-ink-300'
            }`}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px mb-3 mx-1 ${i < currentIdx ? 'bg-ink-400' : 'bg-ink-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
