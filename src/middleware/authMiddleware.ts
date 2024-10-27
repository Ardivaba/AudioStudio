import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../utils/config'

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const tokenString = req.cookies['auth_token']
    if (!tokenString) {
        return res.status(401).json({ status: "fail", message: "You are not logged in" })
    }

    try {
        const decoded = jwt.verify(tokenString, config.app.jwtSecret) as jwt.JwtPayload
        if (!decoded || typeof decoded !== 'object') {
            throw new Error('Invalid token claim')
        }
        
        (req as any).user = decoded

        next()
    } catch (err) {
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ status: "fail", message: `Invalid token: ${err.message}` })
        }
        return res.status(401).json({ status: "fail", message: "Invalid token claim" })
    }
}