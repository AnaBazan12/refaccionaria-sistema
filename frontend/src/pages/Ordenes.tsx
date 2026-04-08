import { useEffect, useState } from 'react'
import {
  getOrdenes, cambiarEstado, marcarPagada
} from '../services/orden.service'
import {
  colorEstado, labelEstado, ESTADOS_ORDEN
} from '../utils/estados'
import ModalCrearOrden from '../components/ui/ModalCrearOrden'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import OrdenDetalleModal from '../components/ui/OrdenDetalle'

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false) // Corregido: eliminado el estado de vehículos de aquí
  const { usuario } = useAuth()
  const esMecanico = usuario?.rol === 'MECANICO'
  const [verArchivadas, setVerArchivadas] = useState(false)
 const [ordenSeleccionada, setOrdenSeleccionada] = useState<any>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await getOrdenes({
        ...(filtroEstado ? { estado: filtroEstado } : {}),
        archivadas: verArchivadas
      })
      setOrdenes(data)
    } catch (error) {
      console.error("Error cargando órdenes:", error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { 
    cargar() 
  }, [filtroEstado, verArchivadas])

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await cambiarEstado(id, nuevoEstado)
      cargar()
    } catch (error) {
      alert("No se pudo cambiar el estado")
    }
  }

  const handlePagar = async (id: string) => {
    try {
      await marcarPagada(id)
      cargar()
    } catch (error) {
      alert("Error al procesar pago")
    }
  }

  const handleArchivarIndividual = async (id: string) => {
    try {
      await api.patch(`/ordenes/${id}/archivar`)
      cargar()
    } catch (error) {
      alert("Error al archivar la orden")
    }
  }

  const handleArchivarViejas = async () => {
    if (!confirm('¿Archivar todas las órdenes entregadas y pagadas de más de 30 días?')) return
    try {
      await api.post('/ordenes/archivar-viejas')
      cargar()
    } catch (error) {
      alert("Error al archivar órdenes antiguas")
    }
  }

  return (
    
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {verArchivadas ? 'Archivo de Órdenes' : (esMecanico ? 'Mis órdenes asignadas' : 'Órdenes de trabajo')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'} {verArchivadas ? 'archivadas' : 'activas'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setVerArchivadas(!verArchivadas)
              setFiltroEstado('')
            }}
            className={`text-xs px-4 py-2 rounded-lg border font-medium transition-all
              ${verArchivadas 
                ? 'bg-gray-800 text-white border-gray-800 shadow-md' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {verArchivadas ? '← Ver activas' : '📁 Ver archivadas'}
          </button>

          {!esMecanico && !verArchivadas && (
            <button
              onClick={() => setModalAbierto(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-100"
            >
              + Nueva orden
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroEstado('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors 
              ${!filtroEstado ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            Todas
          </button>
          {ESTADOS_ORDEN.map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors 
                ${filtroEstado === estado ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              {labelEstado[estado]}
            </button>
          ))}
        </div>

        {!esMecanico && !verArchivadas && (
          <button
            onClick={handleArchivarViejas}
            className="text-xs text-amber-600 font-bold hover:text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            📦 Archivar viejas (+30d)
          </button>
        )}
      </div>
      
      {/* Lista de órdenes */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando órdenes...</div>
      ) : ordenes.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400">No se encontraron órdenes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {ordenes.map(orden => (
            <div key={orden.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-mono font-black text-gray-300">#{orden.numero}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight ${colorEstado[orden.estado]}`}>
                      {labelEstado[orden.estado]}
                    </span>
                    {orden.pagado && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">✓ PAGADA</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    
                  <div
  key={orden.id}
  className="bg-white rounded-xl border border-gray-200
             p-5 hover:shadow-sm transition-shadow"
>
  {/* Agrega este botón arriba de las acciones */}
  <button
    onClick={() => setOrdenSeleccionada(orden)}
    className="text-xs text-blue-600 hover:underline mb-2"
  >
    Ver detalle completo →
  </button>

  {/* ...resto del contenido... */}
                    </div>

                {/* Al final del return, antes del modal de crear */}
                 {ordenSeleccionada && (
             <OrdenDetalleModal
               orden={ordenSeleccionada}
                     onCerrar={() => setOrdenSeleccionada(null)}
              onActualizar={() => {
                   cargar()
             // Refrescar la orden seleccionada
             api.get(`/ordenes/${ordenSeleccionada.id}`)
                .then(({ data }) => setOrdenSeleccionada(data))
         }}
   />
        )}
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cliente</div>
                      <div className="text-sm font-bold text-gray-800">{orden.cliente?.nombre}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Vehículo</div>
                      <div className="text-sm font-bold text-gray-700">{orden.vehiculo?.marca} {orden.vehiculo?.modelo}</div>
                      <div className="text-xs font-mono text-gray-400">{orden.vehiculo?.placa}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Responsable</div>
                      <div className="text-sm font-medium text-gray-700">{orden.mecanico?.nombre ?? '⚠️ Sin asignar'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total</div>
                      <div className="text-sm font-black text-blue-600">${Number(orden.total).toLocaleString('es-MX')}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                  {!verArchivadas && (
                    <select
                      value={orden.estado}
                      onChange={e => handleCambiarEstado(orden.id, e.target.value)}
                      className="text-xs font-bold border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {(esMecanico ? ['EN_PROCESO', 'EN_ESPERA_REFACCION', 'LISTO'] : ESTADOS_ORDEN).map(e => (
                        <option key={e} value={e}>{labelEstado[e]}</option>
                      ))}
                    </select>
                  )}

                  {!esMecanico && !verArchivadas && (
                    <>
                      {!orden.pagado && orden.estado === 'ENTREGADO' && (
                        <button
                          onClick={() => handlePagar(orden.id)}
                          className="text-xs font-bold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          💸 Cobrar
                        </button>
                      )}
                      
                      {orden.estado === 'ENTREGADO' && orden.pagado && (
                        <button
                          onClick={() => handleArchivarIndividual(orden.id)}
                          className="text-xs font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-dashed border-gray-200"
                        >
                          📦 Archivar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {modalAbierto && (
        <ModalCrearOrden
          onCerrar={() => setModalAbierto(false)}
          onCreada={() => { setModalAbierto(false); cargar() }}
        />
      )}
    </div>
  )
}