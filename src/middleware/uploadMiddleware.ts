import multer from 'multer'
import path from 'path'
import { Request } from 'express'
import { FileFilterCallback } from 'multer'

interface MulterFile {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    size: number
    destination: string
    filename: string
    path: string
    buffer: Buffer
}

interface MulterRequest extends Request {
    file: MulterFile
}

const storage = multer.diskStorage({
    destination: (req: Request, file: MulterFile, cb: (error: Error | null, destination: string) => void) => {
        cb(null, './uploads/videos')
    },
    filename: (req: Request, file: MulterFile, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})

const fileFilter = (req: Request, file: MulterFile, cb: FileFilterCallback) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/ogg']
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('Invalid file type. Only MP4, WebM, and OGG videos are allowed.'))
    }
}

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 
    }
})

export { MulterRequest }