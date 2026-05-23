import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getMetricasInventario } from '../services/inventario.service'
import { useAuth } from './AuthContext'

interface ItemStockBajo {
  id:          string
  codigo:      string
  nombre:      string
  stockActual: number
  stockMinimo: number
}

interface StockBajoCtx {
  conteo:    number
  items:     ItemStockBajo[]
  cargando:  boolean
  refrescar: () => void
}

const Ctx = createContext<StockBajoCtx>({
  conteo: 0, items: [], cargando: false, refrescar: () => {}
})

export const useStockBajo = () => useContext(Ctx)

const INTERVALO_MS = 5 * 60 * 1000   // refresca cada 5 minutos

export function StockBajoProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth()
  const [conteo,   setConteo]   = useState(0)
  const [items,    setItems]    = useState<ItemStockBajo[]>([])
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async () => {
    // Solo para roles que ven inventario
    if (!usuario || usuario.rol === 'MECANICO') return
    setCargando(true)
    try {
      const metricas = await getMetricasInventario()
      setConteo(metricas.stockBajoCount ?? 0)
    } catch {
      // silencioso — no romper la app si falla
    } finally {
      setCargando(false)
    }
  }, [usuario])

  // Carga inicial
  useEffect(() => { cargar() }, [cargar])

  // Refresco periódico
  useEffect(() => {
    const timer = setInterval(cargar, INTERVALO_MS)
    return () => clearInterval(timer)
  }, [cargar])

  // Carga la lista detallada solo cuando la necesita el panel
  const cargarItems = useCallback(async () => {
    if (!usuario || usuario.rol === 'MECANICO') return
    try {
      const { data } = await import('../services/api').then(m =>
        m.default.get('/reportes/stock-bajo')
      )
      setItems(data.refacciones ?? [])
    } catch { /* silencioso */ }
  }, [usuario])

  // Cuando el conteo > 0, carga la lista detallada en segundo plano
  useEffect(() => {
    if (conteo > 0) cargarItems()
    else            setItems([])
  }, [conteo, cargarItems])

  return (
    <Ctx.Provider value={{ conteo, items, cargando, refrescar: cargar }}>
      {children}
    </Ctx.Provider>
  )
}
