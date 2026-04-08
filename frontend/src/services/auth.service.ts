import api from './api'

export const loginService = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}