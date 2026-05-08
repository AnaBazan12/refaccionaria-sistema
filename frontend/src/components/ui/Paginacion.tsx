interface Props {
  paginaActual: number
  totalPaginas: number
  total: number
  limite: number
  onCambiar: (pagina: number) => void
  cargando?: boolean
}

export default function Paginacion({
  paginaActual,
  totalPaginas,
  total,
  limite,
  onCambiar,
  cargando = false,
}: Props) {
  if (totalPaginas <= 1) return null

  const inicio = (paginaActual - 1) * limite + 1
  const fin    = Math.min(paginaActual * limite, total)

  // Rango de botones numéricos: máximo 5, centrado en la página actual
  const rangeStart = Math.max(1, paginaActual - 2)
  const rangeEnd   = Math.min(totalPaginas, paginaActual + 2)
  const paginas    = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i)

  const btnBase =
    'h-9 min-w-9 px-2 text-sm rounded-lg border font-medium transition-colors disabled:cursor-not-allowed'
  const btnInactivo = `${btnBase} border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40`
  const btnActivo   = `${btnBase} bg-blue-600 border-blue-600 text-white`
  const btnNav      =
    'px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 border-t border-gray-200 mt-2">
      <span className="text-sm text-gray-500">
        Mostrando <span className="font-medium">{inicio}–{fin}</span> de{' '}
        <span className="font-medium">{total}</span>
      </span>

      <div className="flex items-center gap-1">
        {/* Anterior */}
        <button
          onClick={() => onCambiar(paginaActual - 1)}
          disabled={paginaActual === 1 || cargando}
          className={btnNav}
        >
          ← Anterior
        </button>

        {/* Primera página si queda fuera del rango */}
        {rangeStart > 1 && (
          <>
            <button onClick={() => onCambiar(1)} className={btnInactivo}>1</button>
            {rangeStart > 2 && <span className="px-1 text-gray-400 text-sm">…</span>}
          </>
        )}

        {/* Páginas del rango */}
        {paginas.map(p => (
          <button
            key={p}
            onClick={() => onCambiar(p)}
            disabled={cargando}
            className={p === paginaActual ? btnActivo : btnInactivo}
          >
            {p}
          </button>
        ))}

        {/* Última página si queda fuera del rango */}
        {rangeEnd < totalPaginas && (
          <>
            {rangeEnd < totalPaginas - 1 && (
              <span className="px-1 text-gray-400 text-sm">…</span>
            )}
            <button onClick={() => onCambiar(totalPaginas)} className={btnInactivo}>
              {totalPaginas}
            </button>
          </>
        )}

        {/* Siguiente */}
        <button
          onClick={() => onCambiar(paginaActual + 1)}
          disabled={paginaActual === totalPaginas || cargando}
          className={btnNav}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
