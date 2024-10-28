// src/routes/videos.ts
import { Router, Request, Response } from 'express'
import { Video } from '../entities/Video'
import { upload, MulterRequest } from '../middleware/uploadMiddleware'
import fs from 'fs/promises'
import path from 'path'
import { Like } from 'typeorm'
import { authMiddleware } from '../middleware/authMiddleware'
import axios from 'axios'
import FormData from 'form-data'
import { createReadStream } from 'fs'
import { spawn } from 'child_process'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const skip = (page - 1) * limit

        const sortColumn = (req.query.sortColumn as string) || 'created_at'
        const sortDirection = (req.query.sortDirection as 'ASC' | 'DESC') || 'DESC'

        const whereClause: any = {}
        if (req.query.search) {
            whereClause.originalName = Like(`%${req.query.search}%`)
        }

        const [videos, total] = await Video.findAndCount({
            where: whereClause,
            order: { [sortColumn]: sortDirection },
            skip,
            take: limit
        })

        res.json({
            data: videos,
            page,
            total,
            totalPages: Math.ceil(total / limit)
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve videos' })
    }
})

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const video = await Video.findOne({ where: { id: Number(req.params.id) } })
        if (!video) {
            return res.status(404).json({ error: 'Video not found' })
        }
        res.json(video)
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve video' })
    }
})

router.post('/', upload.single('video'), async (req: MulterRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' })
        }

        const video = Video.create({
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            description: req.body.description || null,
            trackingData: { objects: [] },
            calibrationPoints: [],
            compiledTracking: null
        })

        await video.save()
        res.status(201).json(video)
    } catch (error) {
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error)
        }
        res.status(500).json({ error: 'Failed to upload video' })
    }
})

router.put('/:id', async (req: Request, res: Response) => {
    try {
        const video = await Video.findOne({ where: { id: Number(req.params.id) } })
        if (!video) {
            return res.status(404).json({ error: 'Video not found' })
        }

        if (req.body.trackingData) {
            video.trackingData = req.body.trackingData
        }

        if (req.body.calibrationPoints) {
            video.calibrationPoints = req.body.calibrationPoints
        }

        if (req.body.compiledTracking) {
            video.compiledTracking = req.body.compiledTracking
        }

        await video.save()
        res.json(video)
    } catch (error) {
        res.status(500).json({ error: 'Failed to update video' })
    }
})

router.post('/:id/generate-depth', async (req: Request, res: Response) => {
    const videoId = Number(req.params.id)
    const video = await Video.findOne({ where: { id: videoId } })
    if (!video) {
        return res.status(404).json({ error: 'Video not found' })
    }

    video.isGeneratingDepth = true
    video.depthGenerationFailed = false
    await video.save()

    res.json({ status: 'processing' })

    const startTime = Date.now()

    try {
        const videoPath = path.join('./uploads/videos', video.filename)
        const formData = new FormData()
        formData.append('video', createReadStream(videoPath))

        const response = await axios.post('http://localhost:7860/process', formData, {
            headers: { ...formData.getHeaders() },
            params: {
                num_denoising_steps: 4,
                guidance_scale: 1.2,
                max_res: 512,
                process_length: 220
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 600000
        })

        const tempDepthFilename = `temp-${Date.now()}.mp4`
        const finalDepthFilename = `depth-${Date.now()}.mp4`
        const tempDepthPath = path.join('./uploads/videos', tempDepthFilename)
        const finalDepthPath = path.join('./uploads/videos', finalDepthFilename)

        await fs.writeFile(tempDepthPath, Buffer.from(response.data.depth_video, 'base64'))

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', tempDepthPath,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-movflags', '+faststart',
                finalDepthPath
            ])

            ffmpeg.on('close', async (code) => {
                await fs.unlink(tempDepthPath)
                if (code === 0) {
                    resolve(null)
                } else {
                    reject(new Error(`FFmpeg process exited with code ${code}`))
                }
            })
        })

        video.depthFilename = finalDepthFilename
        video.isGeneratingDepth = false
        video.depthGenerationFailed = false
        await video.save()
    } catch (error) {
        video.isGeneratingDepth = false
        video.depthGenerationFailed = true
        await video.save()
    }
})

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const video = await Video.findOne({ where: { id: Number(req.params.id) } })
        if (!video) {
            return res.status(404).json({ error: 'Video not found' })
        }

        const filePath = path.join('./uploads/videos', video.filename)
        await fs.unlink(filePath)

        if (video.depthFilename) {
            const depthPath = path.join('./uploads/videos', video.depthFilename)
            await fs.unlink(depthPath).catch(console.error)
        }

        await video.remove()

        res.status(200).json({ message: 'Video deleted successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete video' })
    }
})

export default router