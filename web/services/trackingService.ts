import axios from 'axios'

const SAM_API_URL = 'http://localhost:7861'

export const trackingService = {
  async uploadVideo(videoUrl: string) {
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`)
    }
    const blob = await response.blob()
    const file = new File([blob], 'video.mp4', { type: 'video/mp4' })

    const formData = new FormData()
    formData.append('video', file)

    const uploadResponse = await axios.post(`${SAM_API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })

    return uploadResponse.data
  },

  async detectObject(videoId: string, points: { x: number, y: number, include: boolean }[], frameNumber: number) {
    const response = await axios.post(`${SAM_API_URL}/detect/frames/${videoId}`, {
      points,
      frame_number: frameNumber
    })
    return response.data
  },

  async trackObject(videoId: string, points: { x: number, y: number, include: boolean }[], initialFrame: number, targetFrames: number[]) {
    const response = await axios.post(`${SAM_API_URL}/track/frames/${videoId}`, {
      points,
      initial_frame: initialFrame,
      target_frames: targetFrames
    })
    return response.data
  }
}