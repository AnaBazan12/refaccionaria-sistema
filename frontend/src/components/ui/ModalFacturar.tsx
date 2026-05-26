import { useState } from 'react'
import { crearFactura, urlPdf, urlXml } from '../../services/cfdi.service'
import type { CfdiItemInput } from '../../services/cfdi.service'

// ── Catálogos SAT básicos ─────────────────────────────────────
const USOS_CFDI = [
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales' },
  { value: 'CP01',label: 'CP01 — Pagos' },
]

const REGIMENES = [
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '612', label: '612 — Personas Físicas con Actividades Empresariales' },
  { value: '616', label: '616 — Sin obligaciones fiscales (Público General)' },
  { value: '626', label: '626 — Régimen Simplificado de Confianza (RESICO)' },
]

const FORMAS_PAGO = [
  { value: '01', label: '01 — Efectivo' },
  { value: '03', label: '03 — Transferencia electrónica' },
  { value: '04', label: '04 — Tarjeta de crédito/débito' },
  { value: '28', label: '28 — Tarjeta de débito' },
  { value: '99', label: '99 — Por definir' },
]

interface Item {
  descripcion:    string
  cantidad:       string
  precioUnitario: string
  codigoSat:      string
  claveUnidad:    string
}

const itemVacio = (): Item => ({
  descripcion:    '',
  cantidad:       '1',
  precioUnitario: '',
  codigoSat:      '78101803',
  claveUnidad:    'E48',
})

interface Props {
  ordenId?:    string
  onCerrar:    () => void
  onFacturada: (cfdiId: string) => void
  // Datos pre-llenados opcionales (de la orden)
  itemsPrevios?: { descripcion: string; cantidad: number; precioUnitario: number; codigoSat?: string; claveUnidad?: string }[]
}

export default function ModalFacturar({ ordenId, onCerrar, onFacturada, itemsPrevios }: Props) {
  // Receptor
  const [rfc,           setRfc]           = useState('XAXX010101000')
  const [nombre,        setNombre]        = useState('PUBLICO EN GENERAL')
  const [usoCfdi,       setUsoCfdi]       = useState('S01')
  const [regimenFiscal, setRegimenFiscal] = useState('616')
  const [codigoPostal,  setCodigoPostal]  = useState('')

  // Items
  const [items, setItems] = useState<Item[]>(
    itemsPrevios?.length
      ? itemsPrevios.map(i => ({
          descripcion:    i.descripcion,
          cantidad:       String(i.cantidad),
          precioUnitario: String(i.precioUnitario),
          codigoSat:      i.codigoSat  ?? '78101803',
          claveUnidad:    i.claveUnidad ?? 'E48',
        }))
      : [itemVacio()]
  )

  // Pago
  const [formaPago,  setFormaPago]  = useState('01')
  const [metodoPago, setMetodoPago] = useState<'PUE' | 'PPD'>('PUE')

  // Estado
  const [facturando, setFacturando] = useState(false)
  const [error,      setError]      = useState('')
  const [resultado,  setResultado]  = useState<{ id: string; folio: number; serie: string | null; uuid: string } | null>(null)

  /* ── Cálculos ────────────────────────────────────────────── */
  const subtotalCalc = items.reduce((s, i) => {
    const p = parseFloat(i.precioUnitario) || 0
    const q = parseFloat(i.cantidad)       || 0
    return s + p * q
  }, 0)
  const ivaCalc   = subtotalCalc * 0.16
  const totalCalc = subtotalCalc + ivaCalc

  /* ── Item handlers ────────────────────────────────────────── */
  const setItem = (idx: number, field: keyof Item, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))

  const addItem    = () => setItems(prev => [...prev, itemVacio()])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  /* ── Enviar ───────────────────────────────────────────────── */
  const handleFacturar = async () => {
    setError('')

    // Validar
    if (!rfc.trim() || !nombre.trim() || !codigoPostal.trim()) {
      setError('RFC, nombre y código postal del receptor son requeridos')
      return
    }
    if (items.some(it => !it.descripcion.trim() || !it.precioUnitario)) {
      setError('Todos los conceptos deben tener descripción y precio')
      return
    }

    setFacturando(true)
    try {
      const payload = {
        ordenId,
        receptor: { rfc: rfc.toUpperCase().trim(), nombre: nombre.trim(), usoCfdi, regimenFiscal, codigoPostal },
        items: items.map(it => ({
          descripcion:    it.descripcion.trim(),
          cantidad:       parseFloat(it.cantidad)       || 1,
          precioUnitario: parseFloat(it.precioUnitario) || 0,
          codigoSat:      it.codigoSat   || '78101803',
          claveUnidad:    it.claveUnidad || 'E48',
        } as CfdiItemInput)),
        formaPago,
        metodoPago,
      }

      const res = await crearFactura(payload)
      setResultado({
        id:    res.cfdi.id,
        folio: res.cfdi.folio,
        serie: res.cfdi.serie,
        uuid:  res.cfdi.uuid,
      })
      onFacturada(res.cfdi.id)
    } catch (err: any) {
      setError(err.response?.data?.mensaje ?? err.message ?? 'Error al timbrar CFDI')
    } finally {
      setFacturando(false)
    }
  }

  /* ── Pantalla de éxito ────────────────────────────────────── */
  if (resultado) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-8 text-center space-y-5">
          <div className="text-5xl">🧾</div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">¡Factura timbrada!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Folio <span className="font-semibold">{resultado.serie ?? ''}{resultado.folio}</span>
            </p>
            {resultado.uuid && (
              <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                UUID: {resultado.uuid}
              </p>
            )}
          </div>

          {/* Descarga */}
          <div className="flex gap-3 justify-center">
            <a
              href={urlPdf(resultado.id)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700
                         text-white text-sm font-medium rounded-xl transition-colors"
            >
              📄 Descargar PDF
            </a>
            <a
              href={urlXml(resultado.id)}
              download
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                         text-white text-sm font-medium rounded-xl transition-colors"
            >
              ⬇️ Descargar XML
            </a>
          </div>

          <button
            onClick={onCerrar}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  /* ── Formulario ───────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-bold text-gray-800">Emitir factura CFDI</h2>
            {ordenId && <p className="text-xs text-gray-400 mt-0.5">Orden vinculada</p>}
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Receptor ─────────────────────────────── */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Datos del receptor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">RFC *</label>
                <input
                  value={rfc}
                  onChange={e => setRfc(e.target.value.toUpperCase())}
                  placeholder="XAXX010101000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre / Razón social *</label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="PUBLICO EN GENERAL"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Uso del CFDI</label>
                <select
                  value={usoCfdi}
                  onChange={e => setUsoCfdi(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {USOS_CFDI.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Régimen fiscal</label>
                <select
                  value={regimenFiscal}
                  onChange={e => setRegimenFiscal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CP domicilio fiscal *</label>
                <input
                  value={codigoPostal}
                  onChange={e => setCodigoPostal(e.target.value)}
                  placeholder="58000"
                  maxLength={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

            </div>
          </section>

          {/* ── Conceptos ────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Conceptos</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                + Agregar concepto
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{idx + 1}.</span>
                    <input
                      value={item.descripcion}
                      onChange={e => setItem(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción del servicio o producto"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                        title="Eliminar concepto"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-7">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={e => setItem(idx, 'cantidad', e.target.value)}
                        min="1"
                        step="1"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Precio unit.</label>
                      <input
                        type="number"
                        value={item.precioUnitario}
                        onChange={e => setItem(idx, 'precioUnitario', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Clave SAT</label>
                      <select
                        value={item.codigoSat}
                        onChange={e => setItem(idx, 'codigoSat', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="78101803">78101803 (Servicio taller)</option>
                        <option value="25172500">25172500 (Refacción)</option>
                        <option value="84111506">84111506 (Diagnóstico)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Unidad</label>
                      <select
                        value={item.claveUnidad}
                        onChange={e => setItem(idx, 'claveUnidad', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="E48">E48 (Servicio)</option>
                        <option value="H87">H87 (Pieza)</option>
                        <option value="ACT">ACT (Actividad)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total preview */}
            <div className="mt-3 bg-gray-50 rounded-xl p-3 text-right text-sm space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>${subtotalCalc.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IVA 16%</span>
                <span>${ivaCalc.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>${totalCalc.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* ── Pago ─────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Forma de pago</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Forma de pago</label>
                <select
                  value={formaPago}
                  onChange={e => setFormaPago(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FORMAS_PAGO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
                <select
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value as 'PUE' | 'PPD')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PUE">PUE — Pago en una sola exhibición</option>
                  <option value="PPD">PPD — Pago en parcialidades o diferido</option>
                </select>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onCerrar}
            className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleFacturar}
            disabled={facturando}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700
                       disabled:bg-blue-400 text-white text-sm font-semibold
                       rounded-xl transition-colors"
          >
            {facturando ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Timbrando…
              </>
            ) : (
              '🧾 Timbrar CFDI'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
