import { useEffect, useState } from 'react'
import {
  getProveedores, crearProveedor, actualizarProveedor,
  calcularFactura, getFacturas, marcarFacturaPagada
} from '../services/proveedor.service'

// Definición de tipos para las pestañas de la interfaz
type Tab = 'proveedores' | 'facturas'

// Estados iniciales para limpiar formularios
const formVacio = {
  nombre: '', contacto: '', telefono: '',
  ivaPorcentaje: '16', descuentoPorcentaje: '0'
}

const facturaVacia = {
  proveedorId: '', numeroFactura: '', subtotal: '', notas: ''
}

export default function Proveedores() {
  // --- Estados de la Interfaz ---
  const [tab, setTab] = useState<Tab>('proveedores')
  const [proveedores, setProveedores] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  
  // --- Estados de Modales y Formularios ---
  const [modalProv, setModalProv] = useState(false)
  const [modalFact, setModalFact] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState(formVacio)
  const [formFact, setFormFact] = useState(facturaVacia)
  
  // --- Estados de Procesamiento ---
  const [resultado, setResultado] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  /**
   * Carga inicial de datos desde el servidor.
   * Trae tanto proveedores como facturas en paralelo.
   */
  const cargar = async () => {
    setCargando(true)
    try {
      const [p, f] = await Promise.all([getProveedores(), getFacturas()])
      setProveedores(p)
      setFacturas(f)
    } catch (err) {
      setError('Error al cargar los datos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  // --- Funciones de Gestión de Proveedores ---

  const abrirCrear = () => {
    setEditando(null)
    setForm(formVacio)
    setError('')
    setModalProv(true)
  }

  const abrirEditar = (p: any) => {
    setEditando(p)
    setForm({
      nombre: p.nombre,
      contacto: p.contacto ?? '',
      telefono: p.telefono ?? '',
      // Corregido: 'ivaPocentaje' -> 'ivaPorcentaje'
      ivaPorcentaje: p.ivaPorcentaje?.toString() ?? '16',
      descuentoPorcentaje: p.descuentoPorcentaje?.toString() ?? '0'
    })
    setError('')
    setModalProv(true)
  }

  /**
   * Maneja el guardado (creación o edición) de un proveedor.
   */
  const handleGuardarProveedor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const payload = {
        nombre: form.nombre,
        contacto: form.contacto || undefined,
        telefono: form.telefono || undefined,
        ivaPorcentaje: Number(form.ivaPorcentaje),
        descuentoPorcentaje: Number(form.descuentoPorcentaje)
      }
      if (editando) {
        await actualizarProveedor(editando.id, payload)
      } else {
        await crearProveedor(payload)
      }
      setModalProv(false)
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  // --- Funciones de Gestión de Facturas ---

  /**
   * Envía los datos para calcular los impuestos y totales de una factura.
   */
  const handleCalcularFactura = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formFact.proveedorId || !formFact.subtotal || !formFact.numeroFactura) {
      setError('Proveedor, número de factura y subtotal son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const data = await calcularFactura({
        proveedorId: formFact.proveedorId,
        subtotal: Number(formFact.subtotal),
        numeroFactura: formFact.numeroFactura,
        notas: formFact.notas || undefined
      })
      setResultado(data)
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al calcular')
    } finally {
      setGuardando(false)
    }
  }

  // Formateador de moneda (MXN)
  const fmt = (n: any) =>
    `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  return (
    <div className="p-6 space-y-6">
      {/* --- Encabezado --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de proveedores y facturas</p>
        </div>
        {tab === 'proveedores' ? (
          <button onClick={abrirCrear} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            + Nuevo proveedor
          </button>
        ) : (
          <button onClick={() => { setFormFact(facturaVacia); setResultado(null); setError(''); setModalFact(true) }} className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            + Calcular factura
          </button>
        )}
      </div>

      {/* --- Selectores de Pestaña --- */}
      <div className="flex border border-gray-300 rounded-lg overflow-hidden w-fit">
        <button onClick={() => setTab('proveedores')} className={`px-5 py-2 text-sm font-medium transition-colors ${tab === 'proveedores' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          🏭 Proveedores
        </button>
        <button onClick={() => setTab('facturas')} className={`px-5 py-2 text-sm font-medium transition-colors ${tab === 'facturas' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          🧾 Facturas
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : tab === 'proveedores' ? (
        
        /* --- LISTA DE PROVEEDORES --- */
        proveedores.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏭</div>
            <div className="text-gray-500">No hay proveedores registrados</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {proveedores.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-bold text-gray-800 text-lg">{p.nombre}</div>
                    {p.contacto && <div className="text-sm text-gray-500 mt-0.5">{p.contacto}</div>}
                  </div>
                  <span className="text-2xl">🏭</span>
                </div>

                <div className="bg-amber-50 rounded-xl p-3 mb-4 space-y-1.5">
                  <div className="text-xs font-semibold text-amber-700 mb-2">Esquema de facturación</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA</span>
                    <span className="font-bold text-green-600">+{p.ivaPorcentaje}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento</span>
                    <span className="font-bold text-red-600">-{p.descuentoPorcentaje}%</span>
                  </div>
                </div>

                {p.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <span>📱</span>
                    <a href={`tel:${p.telefono}`} className="hover:text-blue-600 transition-colors">
                      {p.telefono}
                    </a>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button onClick={() => abrirEditar(p)} className="flex-1 text-xs text-gray-600 hover:text-blue-600 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )

      ) : (

        /* --- TABLA DE FACTURAS --- */
        facturas.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🧾</div>
            <div className="text-gray-500">No hay facturas registradas</div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Factura</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Proveedor</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Subtotal</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">IVA</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Descuento</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Total a pagar</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facturas.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs font-bold text-gray-600">{f.numeroFactura}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{new Date(f.fecha).toLocaleDateString('es-MX')}</div>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800">{f.proveedor?.nombre}</td>
                    <td className="px-5 py-3 text-gray-600">{fmt(f.subtotal)}</td>
                    <td className="px-5 py-3 text-green-600">+{fmt(f.ivaImporte)} <span className="text-xs text-gray-400">({f.ivaPorcentaje}%)</span></td>
                    <td className="px-5 py-3 text-red-500">-{fmt(f.descuentoImporte)} <span className="text-xs text-gray-400">({f.descuentoPorcentaje}%)</span></td>
                    <td className="px-5 py-3 font-bold text-gray-900">{fmt(f.totalPagar)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${f.pagada ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {f.pagada ? '✓ Pagada' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {!f.pagada && (
                        <button onClick={async () => { await marcarFacturaPagada(f.id); cargar(); }} className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                          Marcar pagada
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* --- MODAL PROVEEDOR --- */}
      {modalProv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
              <button onClick={() => setModalProv(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleGuardarProveedor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                  <input value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-semibold text-amber-800">Esquema predeterminado</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">% IVA</label>
                    <input type="number" value={form.ivaPorcentaje} onChange={e => setForm(f => ({ ...f, ivaPorcentaje: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">% Descuento</label>
                    <input type="number" value={form.descuentoPorcentaje} onChange={e => setForm(f => ({ ...f, descuentoPorcentaje: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalProv(false)} className="text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CALCULAR FACTURA (Simplificado el resultado) --- */}
      {modalFact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Calcular factura</h2>
              <button onClick={() => { setModalFact(false); setResultado(null) }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            {resultado ? (
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(resultado.desglose.subtotal)}</span></div>
                  <div className="flex justify-between text-green-600"><span>IVA:</span><span>{resultado.desglose.mas_iva}</span></div>
                  <div className="flex justify-between text-red-500"><span>Descuento:</span><span>{resultado.desglose.menos_desc}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span className="text-blue-700">{fmt(resultado.desglose.total_pagar)}</span></div>
                </div>
                <button onClick={() => { setModalFact(false); setResultado(null) }} className="w-full py-2.5 bg-blue-600 text-white rounded-lg">Listo</button>
              </div>
            ) : (
              <form onSubmit={handleCalcularFactura} className="p-6 space-y-4">
                {/* Formulario de factura */}
                <select value={formFact.proveedorId} onChange={e => setFormFact(f => ({ ...f, proveedorId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <input placeholder="Número de factura" value={formFact.numeroFactura} onChange={e => setFormFact(f => ({ ...f, numeroFactura: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                <input type="number" step="0.01" placeholder="Subtotal $" value={formFact.subtotal} onChange={e => setFormFact(f => ({ ...f, subtotal: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <button type="submit" disabled={guardando} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium">{guardando ? 'Calculando...' : 'Calcular'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}