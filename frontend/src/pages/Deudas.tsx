import { useEffect, useState } from 'react'
import api from '../services/api'

/* ─── tipos ─────────────────────────────────────────────────── */
interface Pago {
  id: string
  tipo: string
  monto: number
  fecha: string
  notas?: string
  usuario?: { nombre: string }
}

interface Orden {
  id: string
  numero?: number
  estado: string
  total: number
  totalPagado: number
  saldoPendiente: number
  estadoPago: string
  createdAt: string
  cliente?: { nombre: string; telefono?: string }
  vehiculo?: { placa: string; marca: string; modelo: string }
  pagos: Pago[]
}

interface DatosDeuda {
  totalDeuda: string
  totalAnticipos: string
  totalClientes: number
  deudas: Orden[]
  anticipos: Orden[]
}

/* ─── helpers ───────────────────────────────────────────────── */
const fmt = (n: any) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const estadoBadge: Record<string, string> = {
  RECIBIDO:             'bg-blue-100 text-blue-700',
  EN_PROCESO:           'bg-yellow-100 text-yellow-700',
  EN_ESPERA_REFACCION:  'bg-orange-100 text-orange-700',
  LISTO:                'bg-green-100 text-green-700',
  ENTREGADO:            'bg-gray-100 text-gray-600',
}
const estadoLabel: Record<string, string> = {
  RECIBIDO:            'Recibido',
  EN_PROCESO:          'En proceso',
  EN_ESPERA_REFACCION: 'Espera refacción',
  LISTO:               'Listo',
  ENTREGADO:           'Entregado',
}

const tipoPagoColor: Record<string, string> = {
  CONTADO:  'bg-green-100 text-green-700',
  ANTICIPO: 'bg-blue-100 text-blue-700',
  ABONO:    'bg-purple-100 text-purple-700',
  CREDITO:  'bg-red-100 text-red-700',
}

/* ─── modal de pago ─────────────────────────────────────────── */
function ModalPago({
  orden,
  onCerrar,
  onGuardado,
}: {
  orden: Orden
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('ABONO')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    const m = parseFloat(monto)
    if (!m || m <= 0) { setError('Ingresa un monto válido'); return }
    if (m > Number(orden.saldoPendiente)) {
      setError(`El monto no puede superar el saldo pendiente (${fmt(orden.saldoPendiente)})`)
      return
    }
    setGuardando(true)
    setError('')
    try {
      await api.post(`/ordenes/${orden.id}/pagos`, { monto: m, tipo, notas })
      onGuardado()
    } catch (e: any) {
      setError(e?.response?.data?.mensaje ?? 'Error al registrar el pago')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Registrar pago</h2>
            <p className="text-sm text-gray-500">
              {orden.cliente?.nombre} · #{orden.numero ?? orden.id.slice(0, 6)}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* resumen saldo */}
        <div className="mx-6 mt-4 bg-gray-50 rounded-xl p-4 flex gap-4 text-sm">
          <div className="flex-1 text-center">
            <div className="text-gray-500">Total orden</div>
            <div className="font-bold text-gray-800">{fmt(orden.total)}</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-gray-500">Ya pagado</div>
            <div className="font-bold text-green-600">{fmt(orden.totalPagado)}</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-gray-500">Saldo pendiente</div>
            <div className="font-bold text-red-600">{fmt(orden.saldoPendiente)}</div>
          </div>
        </div>

        {/* historial pagos previos */}
        {orden.pagos.length > 0 && (
          <div className="mx-6 mt-3">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Pagos anteriores</p>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {orden.pagos.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${tipoPagoColor[p.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.tipo}
                    </span>
                    <span className="text-gray-500">
                      {new Date(p.fecha).toLocaleDateString('es-MX')}
                    </span>
                    {p.usuario && <span className="text-gray-400">· {p.usuario.nombre}</span>}
                  </div>
                  <span className="font-semibold text-gray-700">{fmt(p.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* formulario */}
        <div className="px-6 pt-4 pb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a pagar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {['ABONO', 'CONTADO', 'ANTICIPO'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`py-2 text-sm rounded-lg border font-medium transition-colors ${
                    tipo === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Pago con transferencia…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
          >
            {guardando ? 'Guardando…' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── fila de orden ─────────────────────────────────────────── */
function FilaOrden({
  orden,
  mostrarSaldo,
  onPagar,
}: {
  orden: Orden
  mostrarSaldo: boolean
  onPagar: (o: Orden) => void
}) {
  const [expandida, setExpandida] = useState(false)

  const telLimpio = orden.cliente?.telefono?.replace(/\D/g, '') ?? ''
  const msgWa = encodeURIComponent(
    mostrarSaldo
      ? `Hola ${orden.cliente?.nombre}, te recordamos que tienes un saldo pendiente de ${fmt(orden.saldoPendiente)} por el servicio de tu ${orden.vehiculo?.marca} ${orden.vehiculo?.modelo}. ¡Gracias!`
      : `Hola ${orden.cliente?.nombre}, tu ${orden.vehiculo?.marca} ${orden.vehiculo?.modelo} ya tiene un anticipo de ${fmt(orden.totalPagado)} registrado. Cuando lo retires pagarás ${fmt(orden.saldoPendiente)} restante. ¡Gracias!`
  )

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setExpandida(!expandida)}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{expandida ? '▼' : '▶'}</span>
            <div>
              <div className="font-medium text-gray-800">{orden.cliente?.nombre}</div>
              {orden.cliente?.telefono && (
                <a
                  href={`tel:${orden.cliente.telefono}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {orden.cliente.telefono}
                </a>
              )}
            </div>
          </div>
        </td>
        <td className="px-5 py-3 text-gray-600 text-sm">
          {orden.vehiculo?.marca} {orden.vehiculo?.modelo}
          <div className="text-xs text-gray-400 font-mono">{orden.vehiculo?.placa}</div>
        </td>
        <td className="px-5 py-3">
          <div className="font-mono text-xs font-bold text-gray-500">
            #{orden.numero ?? orden.id.slice(0, 6)}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge[orden.estado] ?? 'bg-gray-100 text-gray-600'}`}>
            {estadoLabel[orden.estado] ?? orden.estado}
          </span>
        </td>
        <td className="px-5 py-3 text-gray-700 text-sm">{fmt(orden.total)}</td>
        <td className="px-5 py-3 text-green-600 text-sm font-medium">{fmt(orden.totalPagado)}</td>
        <td className="px-5 py-3">
          <span className={`font-bold text-base ${mostrarSaldo ? 'text-red-600' : 'text-blue-600'}`}>
            {fmt(orden.saldoPendiente)}
          </span>
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {mostrarSaldo && (
              <button
                onClick={() => onPagar(orden)}
                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                + Pago
              </button>
            )}
            {telLimpio && (
              <a
                href={`https://wa.me/52${telLimpio}?text=${msgWa}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                📱
              </a>
            )}
          </div>
        </td>
      </tr>
      {/* historial expandido */}
      {expandida && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-5 py-3">
            {orden.pagos.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sin pagos registrados</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {orden.pagos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className={`px-2 py-0.5 rounded-full font-medium ${tipoPagoColor[p.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.tipo}
                    </span>
                    <span className="font-semibold text-gray-700">{fmt(p.monto)}</span>
                    <span className="text-gray-400">
                      {new Date(p.fecha).toLocaleDateString('es-MX')}
                    </span>
                    {p.notas && <span className="text-gray-500 italic">"{p.notas}"</span>}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

/* ─── tabla ─────────────────────────────────────────────────── */
function TablaOrdenes({
  ordenes,
  mostrarSaldo,
  onPagar,
}: {
  ordenes: Orden[]
  mostrarSaldo: boolean
  onPagar: (o: Orden) => void
}) {
  if (!ordenes.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">✅</div>
        <div className="text-gray-500 font-medium">
          {mostrarSaldo ? 'No hay deudas pendientes' : 'No hay anticipos registrados'}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Cliente</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Vehículo</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Orden</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Total</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Pagado</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
              {mostrarSaldo ? 'Debe' : 'Restante'}
            </th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ordenes.map((o) => (
            <FilaOrden
              key={o.id}
              orden={o}
              mostrarSaldo={mostrarSaldo}
              onPagar={onPagar}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── página principal ──────────────────────────────────────── */
export default function Deudas() {
  const [datos, setDatos] = useState<DatosDeuda | null>(null)
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState<'deudas' | 'anticipos'>('deudas')
  const [ordenPago, setOrdenPago] = useState<Orden | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/ordenes/deudas/pendientes')
      setDatos(data)
    } catch (e) {
      console.error('Error al cargar cuentas por cobrar:', e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handlePagoGuardado = () => {
    setOrdenPago(null)
    cargar()
  }

  const tabs = [
    {
      key: 'deudas' as const,
      label: 'Deudas',
      count: datos?.deudas.length ?? 0,
      color: 'red',
    },
    {
      key: 'anticipos' as const,
      label: 'Anticipos / Abonos',
      count: datos?.anticipos.length ?? 0,
      color: 'blue',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cuentas por cobrar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Deudas, anticipos y abonos de clientes
        </p>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando…</div>
      ) : (
        <>
          {/* tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-5">
              <div className="text-sm text-red-500 font-medium mb-1">💸 Total por cobrar</div>
              <div className="text-3xl font-bold text-red-700">{fmt(datos?.totalDeuda)}</div>
              <div className="text-xs text-red-400 mt-1">{datos?.deudas.length ?? 0} órdenes entregadas</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <div className="text-sm text-blue-500 font-medium mb-1">🔵 Total en anticipos</div>
              <div className="text-3xl font-bold text-blue-700">{fmt(datos?.totalAnticipos)}</div>
              <div className="text-xs text-blue-400 mt-1">{datos?.anticipos.length ?? 0} órdenes en proceso</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <div className="text-sm text-amber-500 font-medium mb-1">👥 Clientes activos</div>
              <div className="text-3xl font-bold text-amber-700">{datos?.totalClientes ?? 0}</div>
              <div className="text-xs text-amber-400 mt-1">con saldo o anticipo</div>
            </div>
          </div>

          {/* tabs */}
          <div className="flex gap-2 border-b border-gray-200 pb-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                  tab === t.key
                    ? t.color === 'red'
                      ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                      : 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    tab === t.key
                      ? t.color === 'red'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-blue-200 text-blue-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* contenido del tab */}
          {tab === 'deudas' ? (
            <TablaOrdenes
              ordenes={datos?.deudas ?? []}
              mostrarSaldo={true}
              onPagar={setOrdenPago}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Órdenes activas donde el cliente ya dejó anticipo o abono. Al entregar el vehículo
                solo cobrará el saldo restante.
              </p>
              <TablaOrdenes
                ordenes={datos?.anticipos ?? []}
                mostrarSaldo={false}
                onPagar={setOrdenPago}
              />
            </div>
          )}
        </>
      )}

      {/* modal de pago */}
      {ordenPago && (
        <ModalPago
          orden={ordenPago}
          onCerrar={() => setOrdenPago(null)}
          onGuardado={handlePagoGuardado}
        />
      )}
    </div>
  )
}
