interface CardProps {
  titulo:    string
  valor:     string | number
  subtitulo?: string
  icono:     string
  color:     'blue' | 'green' | 'yellow' | 'red'
}

const colores = {
  blue:   'bg-blue-50   text-blue-600   border-blue-100',
  green:  'bg-green-50  text-green-600  border-green-100',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  red:    'bg-red-50    text-red-600    border-red-100',
}

export default function Card({ titulo, valor, subtitulo, icono, color }: CardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colores[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium opacity-80">{titulo}</span>
        <span className="text-2xl">{icono}</span>
      </div>
      <div className="text-3xl font-bold">{valor}</div>
      {subtitulo && (
        <div className="text-xs opacity-70 mt-1">{subtitulo}</div>
      )}
    </div>
  )
}