import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../utils/config'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body
    if (username !== config.app.jwtUsername || password !== config.app.jwtPassword) {
        return res.status(401).json({ status: "fail", message: "invalid username or password" })
    }

    const now = new Date()
    const token = jwt.sign({
        sub: 'auth_token',
        exp: Math.floor(now.getTime() / 1000) + (72 * 60 * 60),
        iat: Math.floor(now.getTime() / 1000),
        nbf: Math.floor(now.getTime() / 1000)
    }, config.app.jwtSecret)

    res.cookie('auth_token', token, {
        path: '/',
        maxAge: 72 * 60 * 60 * 1000,
        httpOnly: true,
        secure: config.app.isProduction,
        sameSite: 'lax'
    })

    return res.status(200).json({ status: "success" })
})

router.post('/logout', (req: Request, res: Response) => {
    res.cookie('auth_token', '', {
        path: '/',
        expires: new Date(0),
        httpOnly: true,
        secure: config.app.isProduction,
        sameSite: 'lax'
    })

    return res.status(200).json({ status: "success" })
})

export default router