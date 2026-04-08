import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface Usuario {
  id:     string
  nombre: string
  email:  string
  rol:    string
}

interface AuthContextType {
  usuario:  Usuario | null
  token:    string | null
  login:    (token: string, usuario: Usuario) => void
  logout:   () => void
  cargando: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario,  setUsuario]  = useState<Usuario | null>(null)
  const [token,    setToken]    = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // Al cargar la app, recuperar sesión guardada
  useEffect(() => {
    const tokenGuardado   = localStorage.getItem('token')
    const usuarioGuardado = localStorage.getItem('usuario')

    if (tokenGuardado && usuarioGuardado) {
      setToken(tokenGuardado)
      setUsuario(JSON.parse(usuarioGuardado))
    }
    setCargando(false)
  }, [])

  const login = (token: string, usuario: Usuario) => {
    localStorage.setItem('token',   token)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    setToken(token)
    setUsuario(usuario)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)