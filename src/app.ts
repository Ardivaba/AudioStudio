import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './utils/config'

import settingsRoutes from './routes/settings'
import authRoutes from './routes/auth'
import videoRoutes from './routes/videos'

import { authMiddleware } from './middleware/authMiddleware'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'

import { createConnection } from './utils/createConnection'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

const corsOptions = {
    origin: config.app.corsAllowedOrigins.split(',').map(origin => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

app.use(cors(corsOptions))

app.use(helmet({
    crossOriginResourcePolicy: {
        policy: "cross-origin"
    },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            mediaSrc: ["'self'", "blob:", "data:"],
            imgSrc: ["'self'", "blob:", "data:"],
            connectSrc: ["'self'", ...corsOptions.origin]
        }
    }
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/uploads/videos', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin)
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
}, express.static(path.join(__dirname, '../uploads/videos')))

app.use('/api/auth', authRoutes)
app.use('/api/settings', authMiddleware, settingsRoutes)
app.use('/api/videos', authMiddleware, videoRoutes)

app.use(errorHandler)
app.use(notFoundHandler)

const startServer = async () => {
    try {
        await createConnection()
        console.log('Database connected')

        app.listen(config.app.port, () => {
            console.log(`Server running on port ${config.app.port}`)
        })
    } catch (error) {
        console.error('Unable to connect to the database:', error)
        process.exit(1)
    }
}

startServer()

export default app