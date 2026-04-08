import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET!
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d'

export const generarToken = (payload: object): string => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions)
}

export const verificarToken = (token: string): any => {
  return jwt.verify(token, SECRET)
}