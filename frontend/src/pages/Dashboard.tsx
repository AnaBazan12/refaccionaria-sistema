import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import Card from '../components/ui/Card'
import {
  getReporteDiario,
  getStockBajo,
  getOrdenesActivas
} from '../services/dashboard.service'

export default function Dashboard() {
  const [reporte,        setReporte]        = useState<any>(null)
  const [stockBajo,      setStockBajo]      = useState<any[]>([])
  const [ordenesActivas, setOrdenesActivas] = useState<any[]>([])
  const [cargando,       setCargando]       = useState(true)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [rep, stock, ordenes] = await Promise.all([
          getReporteDiario(),
          getStockBajo(),
          getOrdenesActivas()
        ])
        setReporte(rep)
        setStockBajo(stock.refacciones)
        setOrdenesActivas(ordenes)
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [])

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  // Datos para la gráfica de ventas por tipo
  const datosGrafica = reporte?.refacciones?.ventasPorTipo
    ? Object.entries(reporte.refacciones.ventasPorTipo).map(
        ([tipo, datos]: any) => ({
          tipo,
          total:    Number(datos.total).toFixed(2),
          ganancia: Number(datos.ganancia).toFixed(2)
        })
      )
    : []

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="p-6 space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm capitalize">{hoy}</p>
      </div>

      {/* Tarjetas resumen del día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          titulo="Ventas del día"
          valor={`$${Number(reporte?.resumen?.granTotal || 0).toLocaleString('es-MX')}`}
          subtitulo="Total cobrado hoy"
          icono="💰"
          color="green"
        />
        <Card
          titulo="Ganancia refacciones"
          valor={`$${Number(reporte?.resumen?.totalGananciaRefacciones || 0).toLocaleString('es-MX')}`}
          subtitulo="Utilidad del día"
          icono="📈"
          color="blue"
        />
        <Card
          titulo="Órdenes activas"
          valor={ordenesActivas.length}
          subtitulo="Autos en el taller"
          icono="🔧"
          color="yellow"
        />
        <Card
          titulo="Stock bajo"
          valor={stockBajo.length}
          subtitulo="Piezas por surtir"
          icono="⚠️"
          color="red"
        />
      </div>

      {/* Gráfica + Órdenes activas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfica de ventas por tipo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">
            Ventas de hoy por tipo
          </h2>
          {datosGrafica.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datosGrafica}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="tipo" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 12 }}/>
                <Tooltip
                  formatter={(v: any) =>
                    `$${Number(v).toLocaleString('es-MX')}`
                  }
                />
                <Bar dataKey="total"    name="Venta"   fill="#3b82f6" radius={[4,4,0,0]}/>
                <Bar dataKey="ganancia" name="Ganancia" fill="#10b981" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sin ventas registradas hoy
            </div>
          )}
        </div>

        {/* Órdenes activas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">
            Autos en el taller ahora
          </h2>
          {ordenesActivas.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No hay órdenes activas
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-64">
              {ordenesActivas.map((orden: any) => (
                <div
                  key={orden.id}
                  className="flex items-center justify-between
                             bg-gray-50 rounded-lg px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {orden.vehiculo?.marca} {orden.vehiculo?.modelo}
                    </div>
                    <div className="text-xs text-gray-500">
                      {orden.vehiculo?.placa} · {orden.cliente?.nombre}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {orden.mecanico?.nombre ?? 'Sin asignar'}
                    </div>
                    <div className="text-xs font-semibold text-blue-600 text-right">
                      #{orden.numero}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alertas de stock bajo */}
      {stockBajo.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h2 className="font-semibold text-red-600 mb-4">
            ⚠️ Piezas con stock bajo — necesitan surtirse
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Código</th>
                  <th className="pb-2 font-medium">Pieza</th>
                  <th className="pb-2 font-medium">Stock actual</th>
                  <th className="pb-2 font-medium">Mínimo</th>
                  <th className="pb-2 font-medium">Proveedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockBajo.map((r: any) => (
                  <tr key={r.id} className="text-gray-700">
                    <td className="py-2 font-mono text-xs">{r.codigo}</td>
                    <td className="py-2">{r.nombre}</td>
                    <td className="py-2">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                        {r.stockActual}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{r.stockMinimo}</td>
                    <td className="py-2 text-gray-500">{r.proveedor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}