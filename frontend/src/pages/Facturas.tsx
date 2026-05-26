import { useEffect, useState } from 'react'
import { useAuth }     from '../context/AuthContext'
import {
  listarCfdis, cancelarCfdi,
  urlPdf, urlXml,
  CfdiRow,
} from '../services/cfdi.service'
import ModalFacturar from '../components/ui/ModalFacturar'

const fmt = (n: string | number) =>
  `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const ESTADO_CHIP: Record<string, string> = {
  vigente:   'bg-green-100 text-green-700',
  cancelado: 'bg-red-100   text-red-700',
}

export default function Facturas() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'ADMIN'

  const [cfdis,    setCfdis]    = useState<CfdiRow[]>([])
  const [total,    setTotal]    = useState(0)
  const [pagina,   setPagina]   = useState(1)
  const [paginas,  setPaginas]  = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState('')

  const [modalNuevo,     setModalNuevo]     = useState(false)
  const [cancelando,     setCancelando]     = useState<string | null>(null)
  const [confirmCancel,  setConfirmCancel]  = useState<string | null>(null)

  const cargar = async (p = 1) => {
    setCargando(true)
    setError('')
    try {
      const res = await listarCfdis({ page: p, limit: 20 })
      setCfdis(res.cfdis)
      setTotal(res.total)
      setPagina(res.pagina)
      setPaginas(res.paginas)
    } catch {
      setError('No se pudieron cargar las facturas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar(1) }, [])

  const handleCancelar = async (id: string) => {
    setCancelando(id)
    try {
      await cancelarCfdi(id, '02')
      setCfdis(prev => prev.map(c => c.id === id ? { ...c, estado: 'cancelado' } : c))
      setConfirmCancel(null)
    } catch (err: any) {
      alert(err.response?.data?.mensaje ?? 'Error al cancelar')
    } finally {
      setCancelando(null)
    }
  }

  const handleFacturada = () => {
    setModalNuevo(false)
    cargar(1)
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Facturas CFDI</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} factura{total !== 1 ? 's' : ''} en total
          </p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700
                     text-white text-sm font-semibold rounded-xl transition-colors"
        >
          🧾 Nueva factura
        </button>
      </div>

      {/* Nota sandbox */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <div>
          <span className="font-semibold">Modo sandbox activo</span> — Los CFDIs timbrados no tienen validez fiscal.
          Cuando estés listo para producción, desactívalo en{' '}
          <span className="font-medium">Configuración → Facturación</span>.
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cfdis.length === 0 ? (
        <div className="text-center py-20 text-gray-400 space-y-3">
          <div className="text-5xl">🧾</div>
          <p className="text-sm">Aún no hay facturas emitidas</p>
          <button
            onClick={() => setModalNuevo(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Emitir primera factura →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Folio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Receptor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">RFC</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IVA</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cfdis.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800">
                      {c.serie ?? ''}{c.folio}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {fmtFecha(c.fecha)}
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-[180px] truncate">
                      {c.receptor}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                      {c.rfcReceptor}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(c.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(c.iva)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(c.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_CHIP[c.estado] ?? ''}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* PDF */}
                        <a
                          href={urlPdf(c.id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Descargar PDF"
                          className="text-red-500 hover:text-red-700 text-base leading-none"
                        >
                          📄
                        </a>
                        {/* XML */}
                        <a
                          href={urlXml(c.id)}
                          download
                          title="Descargar XML"
                          className="text-blue-500 hover:text-blue-700 text-base leading-none"
                        >
                          ⬇️
                        </a>
                        {/* Cancelar (solo admin + vigente) */}
                        {esAdmin && c.estado === 'vigente' && (
                          confirmCancel === c.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCancelar(c.id)}
                                disabled={cancelando === c.id}
                                className="text-xs text-red-600 hover:text-red-800 font-semibold"
                              >
                                {cancelando === c.id ? '…' : '¿Sí?'}
                              </button>
                              <button
                                onClick={() => setConfirmCancel(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmCancel(c.id)}
                              title="Cancelar CFDI"
                              className="text-gray-400 hover:text-red-500 text-sm transition-colors"
                            >
                              🚫
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {paginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => cargar(pagina - 1)}
                disabled={pagina <= 1}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg
                           hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-500">
                Página {pagina} de {paginas}
              </span>
              <button
                onClick={() => cargar(pagina + 1)}
                disabled={pagina >= paginas}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg
                           hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal nueva factura */}
      {modalNuevo && (
        <ModalFacturar
          onCerrar={() => setModalNuevo(false)}
          onFacturada={handleFacturada}
        />
      )}
    </div>
  )
}
