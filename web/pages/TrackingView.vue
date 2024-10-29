// web/pages/TrackingView.vue
<template>
  <div class="container mx-auto p-4 relative">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-3xl font-bold">Video Tracking</h1>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="showObjectModal = true">
          Add Object
        </button>
        <button class="btn btn-secondary" :disabled="!hasTracking" @click="compileTracking">
          Compile
        </button>
        <button v-if="video?.compiledTracking" class="btn btn-ghost" :class="{ 'btn-active': showCalibrated }"
          @click="showCalibrated = !showCalibrated">
          Show Calibrated
        </button>
        <button class="btn" @click="$router.push(`/videos/${videoId}`)">
          Back to Video
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-base-200 p-4 rounded-lg">
        <div class="relative">
          <video ref="videoRef" :src="`${baseURL}/uploads/videos/${video?.filename}`" class="w-full rounded-lg"
            @loadedmetadata="handleVideoLoaded" @timeupdate="handleTimeUpdate" @seeking="handleSeeking"
            @ended="handleVideoEnded"></video>
          <canvas ref="canvasRef" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
          <canvas ref="maskCanvasRef" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
          <canvas ref="trackingCanvasRef" class="absolute top-0 left-0 w-full h-full" @mousedown="handleMouseDown"
            @mousemove="handleMouseMove" @mouseup="handleMouseUp" @contextmenu.prevent="handleRightClick"></canvas>
          <video ref="depthVideoRef" :src="`${baseURL}/uploads/videos/${video?.depthFilename}`" class="hidden"
            crossorigin="anonymous" @loadedmetadata="handleDepthVideoLoaded"></video>
        </div>

        <div v-if="depthCheckActive && lastDepthCheck"
          class="absolute px-2 py-1 bg-base-300 rounded shadow text-sm pointer-events-none" :style="{
            left: `${lastDepthCheck.x + 20}px`,
            top: `${lastDepthCheck.y - 30}px`
          }">
          Depth: {{ lastDepthCheck.depth.toFixed(3) }}
          <br>
          Distance: {{ lastDepthCheck.distance.toFixed(2) }}m
        </div>

        <div class="mt-4 space-y-4">
          <div class="flex items-center gap-4">
            <button class="btn" @click="togglePlayPause">
              {{ isPlaying ? 'Pause' : (videoEnded ? 'Start' : 'Play') }}
            </button>
            <div class="flex items-center gap-2">
              <span>Speed:</span>
              <select v-model="playbackSpeed" class="select select-bordered select-sm">
                <option value="0.05">0.05x</option>
                <option value="0.1">0.1x</option>
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <span>Tracking Mode:</span>
              <select v-model="trackingMode" class="select select-bordered select-sm">
                <option value="manual">Manual</option>
                <option value="continuous">Continuous</option>
                <option value="auto">Auto</option>
                <option value="calibration">Calibration</option>
              </select>
            </div>
          </div>

          <div class="w-full">
            <input v-model="currentFrame" type="range" min="0" :max="totalFrames" class="range" step="1"
              @input="handleTimelineChange">
            <div class="flex justify-between text-xs mt-1">
              <span>0:00</span>
              <span>{{ formatTime(videoDuration) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="bg-base-200 p-4 rounded-lg h-3/4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Objects</h2>
            <div v-if="trackingMode === 'auto'" class="flex gap-2">
              <button class="btn btn-sm btn-primary" :disabled="!canAutoTrack || isTracking" @click="startAutoTracking">
                {{ isTracking ? 'Tracking...' : 'Auto Track' }}
              </button>
              <button class="btn btn-sm" :disabled="!canTest" @click="testMask">
                Test
              </button>
            </div>
          </div>
          <div v-if="isUploading" class="mb-4">
            <div class="loading loading-spinner loading-md"></div>
            <span class="ml-2">Uploading video...</span>
          </div>
          <div class="space-y-4 max-h-[calc(100%-4rem)] overflow-y-auto">
            <div v-for="obj in objects" :key="obj.id" class="flex items-center justify-between p-2 rounded bg-base-100">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: obj.color }"></div>
                <span>{{ obj.name }}</span>
              </div>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-ghost" :class="{ 'btn-active': selectedObject?.id === obj.id }"
                  @click="selectObject(obj)">
                  Track
                </button>
                <button class="btn btn-sm btn-error" @click="deleteObject(obj.id)">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-base-200 p-4 rounded-lg h-1/4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Depth Calibration</h2>
            <button class="btn btn-sm btn-secondary" :class="{ 'btn-active': depthCheckActive }"
              @click="depthCheckActive = !depthCheckActive">
              Check Depth {{ lastDepthCheck ? `(${lastDepthCheck.depth.toFixed(3)})` : '' }}
            </button>
            <button class="btn btn-sm btn-primary" :class="{ 'btn-active': trackingMode === 'calibration' }"
              @click="trackingMode = 'calibration'">
              Add Point
            </button>
          </div>
          <div class="space-y-2 max-h-[calc(100%-4rem)] overflow-y-auto">
            <div v-for="(point, index) in calibrationPoints" :key="index"
              class="flex items-center justify-between p-2 rounded bg-base-100">
              <div class="flex gap-2">
                <span>{{ point.distance }}m</span>
                <span class="text-base-content/70">(depth: {{ point.depth.toFixed(3) }})</span>
              </div>
              <button class="btn btn-sm btn-error" @click="deleteCalibrationPoint(index)">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showObjectModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Add New Object</h3>
        <form @submit.prevent="addObject">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Object Name</span>
            </label>
            <input v-model="newObject.name" type="text" class="input input-bordered" required>
          </div>
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Color</span>
            </label>
            <div class="grid grid-cols-8 gap-2 mb-2">
              <button v-for="color in predefinedColors" :key="color" type="button"
                class="w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform" :class="{
                  'border-primary': newObject.color === color,
                  'border-base-content/10': newObject.color !== color
                }" :style="{ backgroundColor: color }" @click="newObject.color = color"></button>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-sm">Custom color:</span>
              <input v-model="newObject.color" type="color" class="w-12 h-8">
            </div>
          </div>
          <div class="modal-action">
            <button type="submit" class="btn btn-primary">Add</button>
            <button type="button" class="btn" @click="showObjectModal = false">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showCalibrationModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Add Calibration Point</h3>
        <form @submit.prevent="addCalibrationPoint">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Distance from camera (meters)</span>
            </label>
            <input v-model.number="newCalibrationPoint.distance" type="number" step="0.1" min="0.1"
              class="input input-bordered" required>
          </div>
          <div class="modal-action">
            <button type="submit" class="btn btn-primary">Add</button>
            <button type="button" class="btn" @click="cancelCalibrationPoint">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useVideosStore } from '../stores/videos'
  import { trackingService } from '../services/trackingService'
  import { v4 as uuidv4 } from 'uuid'

  const baseURL = window.baseURL
  const route = useRoute()
  const videoStore = useVideosStore()

  const videoId = computed(() => route.params.id)
  const video = computed(() => videoStore.currentVideo)
  const videoUrl = computed(() => `${baseURL}/uploads/videos/${video.value?.filename}`)
  const fps = computed(() => videoStore.fps)

  const videoRef = ref(null)
  const depthVideoRef = ref(null)
  const depthCanvas = ref(document.createElement('canvas'))
  const depthContext = ref(null)
  const canvasRef = ref(null)
  const maskCanvasRef = ref(null)
  const trackingCanvasRef = ref(null)
  const showObjectModal = ref(false)
  const showCalibrationModal = ref(false)
  const showCalibrated = ref(false)
  const objects = ref([])
  const selectedObject = ref(null)
  const isPlaying = ref(false)
  const videoEnded = ref(false)
  const playbackSpeed = ref(0.5)
  const trackingMode = ref('manual')
  const currentFrame = ref(0)
  const totalFrames = ref(0)
  const videoDuration = ref(0)
  const autoTrackingPoints = ref([])
  const isUploading = ref(false)
  const activeVideoId = ref(null)
  const calibrationPoints = ref([])
  const newCalibrationPoint = ref({
    x: 0,
    y: 0,
    distance: 1,
    depth: 0
  })
  let tempCalibrationPoint = null
  let animationFrameId = null
  const lastDepthCheck = ref(null)
  const depthCheckActive = ref(false)
  const isTracking = ref(false)

  const hasTracking = computed(() => {
    return objects.value.some(obj => obj.tracking && obj.tracking.length > 0)
  })

  const predefinedColors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#008000', '#FFC0CB', '#A52A2A', '#808080',
    '#FFD700', '#4B0082', '#7FFFD4', '#FF4500'
  ]

  const newObject = ref({
    name: '',
    color: predefinedColors[0]
  })

  const canAutoTrack = computed(() => {
    return activeVideoId.value && autoTrackingPoints.value.length > 0 && !isUploading.value && !isTracking.value
  })

  const canTest = computed(() => {
    return activeVideoId.value && autoTrackingPoints.value.length > 0 && !isUploading.value
  })

  onMounted(async () => {
    await videoStore.getVideo(videoId.value)
    if (video.value?.trackingData?.objects) {
      objects.value = video.value.trackingData.objects
    }
    if (video.value?.calibrationPoints) {
      calibrationPoints.value = video.value.calibrationPoints
    }
    if (videoRef.value) {
      videoRef.value.playbackRate = playbackSpeed.value
    }
    if (depthVideoRef.value) {
      depthVideoRef.value.playbackRate = playbackSpeed.value
    }
    startRenderLoop()
  })

  onUnmounted(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
  })

  watch(depthCheckActive, (newValue) => {
    if (!newValue) {
      lastDepthCheck.value = null
    }
  })

  watch(() => trackingMode.value, async (newMode) => {
    if (newMode === 'auto') {
      try {
        isUploading.value = true
        autoTrackingPoints.value = []

        const result = await uploadVideoForTracking()
        activeVideoId.value = result.video_id

      } catch (error) {
        alert('Failed to upload video for tracking. Please try again.')
        console.log(error)
        trackingMode.value = 'manual'
      } finally {
        isUploading.value = false
      }
    } else if (newMode === 'calibration') {
      tempCalibrationPoint = null
    } else {
      autoTrackingPoints.value = []
      drawObjects()
    }
  })

  watch(playbackSpeed, (newSpeed) => {
    if (videoRef.value) {
      videoRef.value.playbackRate = newSpeed
    }
    if (depthVideoRef.value) {
      depthVideoRef.value.playbackRate = newSpeed
    }
  })

  const handleDepthVideoLoaded = () => {
    depthCanvas.value.width = depthVideoRef.value.videoWidth
    depthCanvas.value.height = depthVideoRef.value.videoHeight
    depthContext.value = depthCanvas.value.getContext('2d')
  }

  const getDepthAtPoint = (x, y) => {
    if (!depthVideoRef.value || !depthContext.value) return null

    depthVideoRef.value.currentTime = currentFrame.value / fps.value
    depthContext.value.drawImage(depthVideoRef.value, 0, 0)
    const imageData = depthContext.value.getImageData(x, y, 1, 1).data
    return imageData[0] / 255.0
  }

  const startRenderLoop = () => {
    const animate = () => {
      if (videoRef.value) {
        const video = videoRef.value
        const progress = video.currentTime / video.duration
        currentFrame.value = Math.round(progress * totalFrames.value)
        if (depthVideoRef.value) {
          depthVideoRef.value.currentTime = video.currentTime
        }
        drawObjects()
      }
      animationFrameId = requestAnimationFrame(animate)
    }
    animate()
  }

  const handleVideoEnded = () => {
    isPlaying.value = false
    videoEnded.value = true
  }

  const handleVideoLoaded = () => {
    const video = videoRef.value
    video.playbackRate = playbackSpeed.value
    videoDuration.value = video.duration
    totalFrames.value = Math.floor(video.duration * fps.value)

    const canvas = canvasRef.value
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const trackingCanvas = trackingCanvasRef.value
    trackingCanvas.width = video.videoWidth
    trackingCanvas.height = video.videoHeight

    const maskCanvas = maskCanvasRef.value
    maskCanvas.width = video.videoWidth
    maskCanvas.height = video.videoHeight
  }

  const handleTimeUpdate = () => {
    if (videoRef.value) {
      const video = videoRef.value
      currentFrame.value = Math.floor(video.currentTime * fps.value)
      if (depthVideoRef.value) {
        depthVideoRef.value.currentTime = video.currentTime
      }
    }
  }

  const handleSeeking = () => {
    const video = videoRef.value
    video.playbackRate = playbackSpeed.value
    if (depthVideoRef.value) {
      depthVideoRef.value.currentTime = video.currentTime
      depthVideoRef.value.playbackRate = playbackSpeed.value
    }
    const progress = video.currentTime / video.duration
    currentFrame.value = Math.round(progress * totalFrames.value)
    drawObjects()
  }

  const interpolateDistance = (depth, calibrationPoints = []) => {
    if (calibrationPoints.length === 0) {
      const baseScale = 0.2
      return baseScale / depth
    }

    calibrationPoints.sort((a, b) => a.depth - b.depth)
    const point = calibrationPoints.find(p => p.depth >= depth)
    const prevPoint = [...calibrationPoints].reverse().find(p => p.depth <= depth)

    if (!point) return prevPoint.distance
    if (!prevPoint) return point.distance

    const depthRatio = (1 / depth - 1 / prevPoint.depth) / (1 / point.depth - 1 / prevPoint.depth)
    return prevPoint.distance + (point.distance - prevPoint.distance) * depthRatio
  }

  const validateCalibrationPoint = (newPoint) => {
    if (calibrationPoints.value.length < 2) return true

    const sorted = [...calibrationPoints.value].sort((a, b) => a.depth - b.depth)
    const index = sorted.findIndex(p => p.depth > newPoint.depth)

    if (index === -1) {
      const last = sorted[sorted.length - 1]
      return newPoint.distance > last.distance
    }

    if (index === 0) {
      const first = sorted[0]
      return newPoint.distance < first.distance
    }

    const prev = sorted[index - 1]
    const next = sorted[index]

    const depthRatio = (newPoint.depth - prev.depth) / (next.depth - prev.depth)
    const expectedDistance = prev.distance + (next.distance - prev.distance) * depthRatio
    const tolerance = 0.1

    return Math.abs(newPoint.distance - expectedDistance) <= tolerance
  }

  const drawObjects = () => {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (trackingMode.value === 'auto') {
      drawAutoTrackingPoints()
      return
    }

    if (trackingMode.value === 'calibration' && tempCalibrationPoint) {
      ctx.beginPath()
      ctx.arc(tempCalibrationPoint.x, tempCalibrationPoint.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#00FF00'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      return
    }

    for (const point of calibrationPoints.value) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#00FF00'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = '14px Arial'
      ctx.fillStyle = '#00FF00'
      ctx.fillText(`${point.distance}m`, point.x + 10, point.y - 10)
    }

    const drawPositions = showCalibrated.value && video.value?.compiledTracking
    const trackingData = drawPositions ? video.value.compiledTracking.objects : objects.value

    for (const obj of trackingData) {
      const position = getObjectPositionAtFrame(obj, currentFrame.value)
      if (!position) continue

      ctx.beginPath()
      ctx.arc(position.x, position.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = obj.color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = '14px Arial'
      ctx.fillStyle = obj.color

      let displayText = obj.name
      if (drawPositions && position.worldX != null && position.worldY != null && position.worldZ != null) {
        displayText += ` (${Number(position.worldX).toFixed(2)}, ${Number(position.worldY).toFixed(2)}, ${Number(position.worldZ).toFixed(2)})`
      }

      ctx.fillText(displayText, position.x + 10, position.y - 10)
    }
  }

  const drawAutoTrackingPoints = () => {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const scaleX = canvas.width / videoRef.value.videoWidth
    const scaleY = canvas.height / videoRef.value.videoHeight

    autoTrackingPoints.value.forEach((point, index) => {
      const canvasX = point.x * scaleX
      const canvasY = point.y * scaleY

      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2)
      ctx.fillStyle = point.include ? 'green' : 'red'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = '14px Arial'
      ctx.fillStyle = point.include ? 'green' : 'red'
      ctx.fillText(index + 1, canvasX + 10, canvasY - 10)
    })
  }

  const getObjectPositionAtFrame = (obj, frame) => {
    const tracking = obj.tracking || []
    const exactFrame = tracking.find(t => t.frameNumber === frame)
    if (exactFrame) return exactFrame

    const prevFrame = [...tracking]
      .reverse()
      .find(t => t.frameNumber <= frame)
    const nextFrame = tracking
      .find(t => t.frameNumber >= frame)

    if (!prevFrame && !nextFrame) return null
    if (!prevFrame) return nextFrame
    if (!nextFrame) return prevFrame

    const frameDiff = nextFrame.frameNumber - prevFrame.frameNumber
    const frameProgress = (frame - prevFrame.frameNumber) / frameDiff

    return {
      x: prevFrame.x + (nextFrame.x - prevFrame.x) * frameProgress,
      y: prevFrame.y + (nextFrame.y - prevFrame.y) * frameProgress,
      z: prevFrame.z + (nextFrame.z - prevFrame.z) * frameProgress,
      worldX: prevFrame.worldX + (nextFrame.worldX - prevFrame.worldX) * frameProgress,
      worldY: prevFrame.worldY + (nextFrame.worldY - prevFrame.worldY) * frameProgress,
      worldZ: prevFrame.worldZ + (nextFrame.worldZ - prevFrame.worldZ) * frameProgress
    }
  }

  const uploadVideoForTracking = async () => {
    if (!video.value?.filename || !videoUrl.value) {
      throw new Error('No video selected')
    }

    return await trackingService.uploadVideo(videoUrl.value)
  }

  const addTrackingPoint = async (x, y) => {
    const obj = objects.value.find(o => o.id === selectedObject.value.id)
    if (!obj) return

    if (!obj.tracking) obj.tracking = []

    const frame = currentFrame.value
    const existingPoint = obj.tracking.findIndex(t => t.frameNumber === frame)

    if (existingPoint !== -1) {
      obj.tracking[existingPoint] = { frameNumber: frame, x, y }
    } else {
      obj.tracking.push({ frameNumber: frame, x, y })
      obj.tracking.sort((a, b) => a.frameNumber - b.frameNumber)
    }

    await saveTrackingData()
    drawObjects()
  }

  const addCalibrationPoint = async () => {
    if (!tempCalibrationPoint) return

    const newPoint = {
      ...tempCalibrationPoint,
      distance: newCalibrationPoint.value.distance
    }

    if (!validateCalibrationPoint(newPoint)) {
      alert('Invalid calibration point. The distance conflicts with existing calibration.')
      return
    }

    calibrationPoints.value.push(newPoint)
    await videoStore.updateVideoCalibration(videoId.value, calibrationPoints.value)

    showCalibrationModal.value = false
    tempCalibrationPoint = null
    trackingMode.value = 'manual'
    newCalibrationPoint.value.distance = 1
    drawObjects()
  }

  const deleteCalibrationPoint = async (index) => {
    try {
      if (!confirm('Are you sure you want to delete this calibration point?')) {
        return
      }

      calibrationPoints.value.splice(index, 1)
      await videoStore.updateVideoCalibration(videoId.value, calibrationPoints.value)
      drawObjects()
    } catch (error) {
      console.error('Error deleting calibration point:', error)
      alert('Failed to delete calibration point')
    }
  }

  const cancelCalibrationPoint = () => {
    showCalibrationModal.value = false
    tempCalibrationPoint = null
    trackingMode.value = 'manual'
    newCalibrationPoint.value.distance = 1
    drawObjects()
  }

  const calculateFOV = (calibrationPoints, videoWidth, videoHeight) => {
    if (calibrationPoints.length < 2) return 45

    let maxPixelDist = 0
    let selectedPoints = null

    for (let i = 0; i < calibrationPoints.length; i++) {
      for (let j = i + 1; j < calibrationPoints.length; j++) {
        const p1 = calibrationPoints[i]
        const p2 = calibrationPoints[j]
        const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
        if (pixelDist > maxPixelDist) {
          maxPixelDist = pixelDist
          selectedPoints = [p1, p2]
        }
      }
    }

    if (!selectedPoints) return 45

    const [p1, p2] = selectedPoints
    const pixelDiff = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    const depthDiff = Math.abs(p2.distance - p1.distance)
    const imageSize = Math.sqrt(Math.pow(videoWidth, 2) + Math.pow(videoHeight, 2))

    const fov = 2 * Math.atan2((pixelDiff * depthDiff) / 2, imageSize) * (180 / Math.PI)
    console.log(fov)
    return Math.min(Math.max(fov, 30), 90)
  }

  const compileTracking = async () => {
    try {
      const compiledObjects = []
      const videoWidth = depthVideoRef.value.videoWidth
      const videoHeight = depthVideoRef.value.videoHeight

      const fov = calculateFOV(video.value.calibrationPoints || [], videoWidth, videoHeight)
      const fovRadians = (fov * Math.PI) / 180
      const fovHalf = Math.tan(fovRadians / 2)

      for (const obj of objects.value) {
        if (!obj.tracking?.length) continue

        const compiledTracking = []
        for (const point of obj.tracking) {
          const frameTime = point.frameNumber / fps.value
          if (frameTime > depthVideoRef.value.duration) continue

          await new Promise((resolve) => {
            const seekHandler = () => {
              depthVideoRef.value.removeEventListener('seeked', seekHandler)
              requestAnimationFrame(() => {
                depthContext.value.drawImage(depthVideoRef.value, 0, 0)
                const imageData = depthContext.value.getImageData(point.x, point.y, 1, 1).data
                const depth = imageData[0] / 255.0

                const worldZ = interpolateDistance(depth, video.value.calibrationPoints || [])
                const normalizedX = (point.x / videoWidth) * 2 - 1
                const normalizedY = -((point.y / videoHeight) * 2 - 1)

                const worldX = normalizedX * worldZ * fovHalf
                const worldY = normalizedY * worldZ * fovHalf

                compiledTracking.push({
                  frameNumber: point.frameNumber,
                  x: point.x,
                  y: point.y,
                  z: depth,
                  worldX,
                  worldY,
                  worldZ
                })
                resolve()
              })
            }
            depthVideoRef.value.addEventListener('seeked', seekHandler)
            depthVideoRef.value.currentTime = frameTime
          })
        }

        compiledObjects.push({
          id: obj.id,
          name: obj.name,
          color: obj.color,
          tracking: compiledTracking
        })
      }

      await videoStore.updateVideoCompiled(videoId.value, { objects: compiledObjects })
      showCalibrated.value = true
    } catch (error) {
      console.error('Compilation error:', error)
      alert('Failed to compile tracking data: ' + error.message)
    }
  }

  const saveTrackingData = async () => {
    try {
      await videoStore.updateVideoTracking(videoId.value, {
        objects: objects.value
      })
    } catch (error) {
      console.error('Error saving tracking data:', error)
    }
  }

  const togglePlayPause = () => {
    const video = videoRef.value
    if (videoEnded.value) {
      video.currentTime = 0
      videoEnded.value = false
      video.playbackRate = playbackSpeed.value
      video.play()
      isPlaying.value = true
    } else if (video.paused) {
      video.playbackRate = playbackSpeed.value
      video.play()
      isPlaying.value = true
    } else {
      video.pause()
      isPlaying.value = false
    }

    if (depthVideoRef.value) {
      depthVideoRef.value.currentTime = video.currentTime
      if (isPlaying.value) {
        depthVideoRef.value.play()
      } else {
        depthVideoRef.value.pause()
      }
    }
  }

  const handleTimelineChange = () => {
    const video = videoRef.value
    video.currentTime = currentFrame.value / fps.value
    video.playbackRate = playbackSpeed.value

    if (depthVideoRef.value) {
      depthVideoRef.value.currentTime = video.currentTime
      depthVideoRef.value.playbackRate = playbackSpeed.value
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const addObject = () => {
    const obj = {
      id: uuidv4(),
      name: newObject.value.name,
      color: newObject.value.color,
      tracking: []
    }
    objects.value.push(obj)
    saveTrackingData()
    showObjectModal.value = false
    newObject.value = { name: '', color: predefinedColors[0] }
  }

  const selectObject = (obj) => {
    selectedObject.value = selectedObject.value?.id === obj.id ? null : obj
    autoTrackingPoints.value = []
    drawObjects()
  }

  const deleteObject = async (id) => {
    if (confirm('Are you sure you want to delete this object?')) {
      objects.value = objects.value.filter(obj => obj.id !== id)
      if (selectedObject.value?.id === id) {
        selectedObject.value = null
      }
      await saveTrackingData()
    }
  }

  const handleMouseDown = async (e) => {
    const rect = trackingCanvasRef.value.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) * (trackingCanvasRef.value.width / rect.width))
    const y = Math.round((e.clientY - rect.top) * (trackingCanvasRef.value.height / rect.height))

    if (trackingMode.value === 'calibration') {
      const depth = getDepthAtPoint(x, y)
      if (depth === null) {
        alert('Failed to get depth value. Make sure depth video is loaded.')
        return
      }
      tempCalibrationPoint = { x, y, depth }
      showCalibrationModal.value = true
      drawObjects()
      return
    }

    if (trackingMode.value === 'auto') {
      if (e.button === 0) {
        autoTrackingPoints.value.push({ x: x, y: y, include: true })
      }
      drawAutoTrackingPoints()
      return
    }

    if (!selectedObject.value) return

    if (trackingMode.value === 'manual') {
      addTrackingPoint(x, y)
    } else if (trackingMode.value === 'continuous') {
      const video = videoRef.value
      video.playbackRate = playbackSpeed.value
      video.play()
      if (depthVideoRef.value) {
        depthVideoRef.value.playbackRate = playbackSpeed.value
        depthVideoRef.value.play()
      }
      addTrackingPoint(x, y)
    }
  }

  const handleMouseMove = async (e) => {
    const rect = trackingCanvasRef.value.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) * (trackingCanvasRef.value.width / rect.width))
    const y = Math.round((e.clientY - rect.top) * (trackingCanvasRef.value.height / rect.height))

    if (depthCheckActive.value) {
      const depth = getDepthAtPoint(x, y)
      if (depth !== null) {
        const distance = interpolateDistance(depth)
        lastDepthCheck.value = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          depth,
          distance
        }
      }
      return
    }

    if (!selectedObject.value || trackingMode.value !== 'continuous') return
    addTrackingPoint(x, y)
  }

  const handleMouseUp = () => {
    if (trackingMode.value === 'continuous') {
      if (videoRef.value) {
        videoRef.value.pause()
      }
      if (depthVideoRef.value) {
        depthVideoRef.value.pause()
      }
    }
  }

  const handleRightClick = (e) => {
    if (trackingMode.value !== 'auto') return

    const canvas = trackingCanvasRef.value
    const rect = canvas.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height))

    autoTrackingPoints.value.push({ x, y, include: false })
    drawAutoTrackingPoints()
  }

  const startAutoTracking = async () => {
    if (!activeVideoId.value) {
      alert('Please wait for video upload to complete')
      return
    }

    if (!selectedObject.value) {
      alert('Please select an object to track')
      return
    }

    if (autoTrackingPoints.value.length === 0) {
      alert('Please add at least one tracking point')
      return
    }

    try {
      isTracking.value = true
      const video = videoRef.value
      const actualFrames = Math.floor(video.duration * fps.value)

      const frameIndices = []
      for (let i = 0; i < actualFrames; i++) {
        const frameTime = i / fps.value
        if (frameTime <= video.duration) {
          frameIndices.push(i)
        }
      }

      const result = await trackingService.trackObject(
        activeVideoId.value,
        autoTrackingPoints.value,
        currentFrame.value,
        frameIndices
      )

      const videoFrameCount = Math.floor(video.duration * fps.value)
      const resultFrameCount = Object.keys(result).length
      const scaleFactor = videoFrameCount / resultFrameCount

      selectedObject.value.tracking = Object.entries(result).map(([_, data], index) => {
        console.log(_);
        const adjustedFrame = Math.round(index * scaleFactor)
        return {
          frameNumber: adjustedFrame,
          x: data.center.x,
          y: data.center.y
        }
      }).sort((a, b) => a.frameNumber - b.frameNumber)

      await saveTrackingData()
      autoTrackingPoints.value = []
      trackingMode.value = 'manual'
    } catch (error) {
      console.error('Error during auto tracking:', error)
      alert('Failed to auto track object')
    } finally {
      isTracking.value = false
    }
  }

  const testMask = async () => {
    if (!activeVideoId.value || autoTrackingPoints.value.length === 0) {
      alert('Please add at least one tracking point')
      return
    }

    try {
      const result = await trackingService.detectObject(
        activeVideoId.value,
        autoTrackingPoints.value,
        currentFrame.value
      )

      if (result.center) {
        const canvas = maskCanvasRef.value
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const scaleX = canvas.width / videoRef.value.videoWidth
        const scaleY = canvas.height / videoRef.value.videoHeight
        const canvasX = result.center.x * scaleX
        const canvasY = result.center.y * scaleY

        ctx.beginPath()
        ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'yellow'
        ctx.fill()
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.stroke()

        const size = 10
        ctx.beginPath()
        ctx.moveTo(canvasX - size, canvasY)
        ctx.lineTo(canvasX + size, canvasY)
        ctx.moveTo(canvasX, canvasY - size)
        ctx.lineTo(canvasX, canvasY + size)
        ctx.stroke()

        setTimeout(() => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }, 2000)
      }
    } catch (error) {
      console.error('Error testing mask:', error)
      alert(`Failed to test object mask: ${error.message}`)
    }
  }
</script>

<style scoped>
  .dropdown-content {
    z-index: 1000;
  }

  .menu details[open]>ul {
    z-index: 1000;
  }
</style>