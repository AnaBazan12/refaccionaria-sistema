import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Deudas() {
  const [datos, setDatos] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)
    try {
      // Asegúrate de que esta ruta coincida con tu backend (clientesConDeuda)
      const { data } = await api.get('/ordenes/deudas/pendientes')
      setDatos(data)
    } catch (error) {
      console.error("Error al cargar deudas:", error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const fmt = (n: any) =>
    `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cuentas por cobrar</h1>
        <p className="text-sm text-gray-500 mt-1">Clientes con saldo pendiente</p>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-5">
              <div className="text-sm text-red-600 font-medium mb-1">Total por cobrar</div>
              <div className="text-3xl font-bold text-red-700">{fmt(datos?.totalDeuda)}</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <div className="text-sm text-amber-600 font-medium mb-1">Clientes con deuda</div>
              <div className="text-3xl font-bold text-amber-700">{datos?.totalClientes ?? 0}</div>
            </div>
          </div>

          {/* Lista */}
          {!datos?.ordenes?.length ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">✅</div>
              <div className="text-gray-500 font-medium">No hay cuentas pendientes</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Cliente</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Vehículo</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Orden</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Total</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Pagado</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Debe</th>
                    <th className="px-5 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datos.ordenes.map((o: any) => (
                    <tr key={o.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-800">{o.cliente?.nombre}</div>
                        {o.cliente?.telefono && (
                          <a 
                            href={`tel:${o.cliente.telefono}`} 
                            className="text-xs text-blue-500 hover:underline"
                          >
                            {o.cliente.telefono}
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {o.vehiculo?.marca} {o.vehiculo?.modelo}
                        <div className="text-xs text-gray-400 font-mono">{o.vehiculo?.placa}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs font-bold text-gray-500">
                        #{o.numero ?? o.id.slice(0, 5)}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{fmt(o.total)}</td>
                      <td className="px-5 py-3 text-green-600">{fmt(o.totalPagado)}</td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-red-600 text-base">{fmt(o.saldoPendiente)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <a 
                          href={`https://wa.me/52${o.cliente?.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hola ${o.cliente?.nombre}, te recordamos que tienes un saldo pendiente de ${fmt(o.saldoPendiente)} por el servicio de tu ${o.vehiculo?.marca} ${o.vehiculo?.modelo}. ¡Gracias!`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          📱 WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}