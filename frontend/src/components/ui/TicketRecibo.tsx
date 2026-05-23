import { useEffect } from 'react'

export interface LineaTicket {
  nombre:         string
  codigo:         string
  cantidad:       number
  precioUnitario: number
  subtotal:       number
}

interface Props {
  items:         LineaTicket[]
  total:         number
  subtotalBruto: number
  descuentoPct:  number
  cliente?:      string
  tipoVenta:     string
  fecha:         Date
  onCerrar:      () => void
  onNuevaVenta:  () => void
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// CSS inyectado solo mientras el componente vive
const CSS_PRINT = `
@media print {
  body > * { visibility: hidden !important; }
  .ticket-print-root,
  .ticket-print-root * { visibility: visible !important; }
  .ticket-print-root {
    position: fixed !important;
    inset: 0 !important;
    width: 80mm !important;
    padding: 4mm 3mm !important;
    margin: 0 auto !important;
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 11px !important;
    line-height: 1.4 !important;
    background: white !important;
    color: black !important;
    z-index: 99999 !important;
  }
  @page { size: 80mm auto; margin: 0; }
}
`

export default function TicketRecibo({
  items, total, subtotalBruto, descuentoPct,
  cliente, tipoVenta, fecha, onCerrar, onNuevaVenta,
}: Props) {

  // Inyectar / limpiar estilos de impresión
  useEffect(() => {
    const el = document.createElement('style')
    el.id    = 'ticket-print-style'
    el.textContent = CSS_PRINT
    document.head.appendChild(el)
    return () => { document.getElementById('ticket-print-style')?.remove() }
  }, [])

  const hasDscto  = descuentoPct > 0
  const tipoLabel = tipoVenta === 'MAYOREO' ? 'Mayoreo' : 'Mostrador'
  const fechaStr  = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr   = fecha.toLocaleTimeString('es-MX',  { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full">

      {/* Cabecera del modal */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-green-500 text-xl">✅</span>
          <h2 className="text-lg font-bold text-gray-800">¡Venta registrada!</h2>
        </div>
        <button
          onClick={onCerrar}
          className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
        >×</button>
      </div>

      {/* Preview del ticket — se imprime */}
      <div className="flex-1 overflow-y-auto p-5">
        <div
          className="ticket-print-root bg-white border border-gray-200 rounded-xl p-5
                     font-mono text-xs max-w-xs mx-auto"
        >
          {/* Encabezado */}
          <div className="text-center mb-3">
            <div className="font-bold text-sm tracking-wide">REFACCIONARIA EL CHINO</div>
            <div className="text-gray-500 text-[11px]">y Taller Mecánico</div>
            <div className="border-b border-dashed border-gray-400 my-2" />
            <div className="text-gray-600">Ticket — {tipoLabel}</div>
            <div className="text-gray-500 text-[10px]">{fechaStr}  {horaStr}</div>
            {cliente && (
              <div className="mt-1 font-medium truncate">Cliente: {cliente}</div>
            )}
          </div>

          {/* Artículos */}
          <div className="border-t border-dashed border-gray-400 mb-2" />
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i}>
                <div className="font-medium truncate leading-tight">{item.nombre}</div>
                <div className="flex justify-between text-gray-500 text-[10px]">
                  <span>{item.cantidad} × ${fmt(item.precioUnitario)}</span>
                  <span className="font-semibold text-gray-800">${fmt(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-400 mt-2 mb-2" />

          {/* Totales */}
          <div className="space-y-0.5">
            {hasDscto && (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>${fmt(subtotalBruto)}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Descuento (-{descuentoPct}%)</span>
                  <span>-${fmt(subtotalBruto * descuentoPct / 100)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-sm pt-0.5">
              <span>TOTAL</span>
              <span>${fmt(total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 mt-3 mb-3" />
          <div className="text-center text-gray-500 text-[10px]">
            ¡Gracias por su compra!
          </div>
        </div>
      </div>

      {/* Footer: nueva venta o imprimir */}
      <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
        <button
          onClick={onNuevaVenta}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-300
                     rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          + Nueva venta
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700 transition-colors
                     flex items-center justify-center gap-2"
        >
          🖨️ Imprimir ticket
        </button>
      </div>
    </div>
  )
}
