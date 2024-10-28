<template>
	<div class="container mx-auto p-4 relative">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-3xl font-bold">Video Tracking</h1>
			<div class="flex gap-2">
				<button class="btn btn-primary" @click="showObjectModal = true">
					Add Object
				</button>
				<button class="btn" @click="$router.push(`/videos/${videoId}`)">
					Back to Video
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2 bg-base-200 p-4 rounded-lg">
				<div class="relative">
					<video
ref="videoRef" :src="`${baseURL}/uploads/videos/${video?.filename}`"
						class="w-full rounded-lg" @loadedmetadata="handleVideoLoaded" @timeupdate="handleTimeUpdate"
						@seeking="handleSeeking" @ended="handleVideoEnded"></video>
					<canvas ref="canvasRef" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
					<canvas
ref="maskCanvasRef"
						class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
					<canvas
ref="trackingCanvasRef" class="absolute top-0 left-0 w-full h-full"
						@mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp"
						@contextmenu.prevent="handleRightClick"></canvas>
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
							</select>
						</div>
					</div>

					<div class="w-full">
						<input
v-model="currentFrame" type="range" min="0" :max="totalFrames" class="range" step="1"
							@input="handleTimelineChange">
						<div class="flex justify-between text-xs mt-1">
							<span>0:00</span>
							<span>{{ formatTime(videoDuration) }}</span>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-base-200 p-4 rounded-lg">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-xl font-bold">Objects</h2>
					<div v-if="trackingMode === 'auto'" class="flex gap-2">
						<button class="btn btn-sm btn-primary" :disabled="!canAutoTrack" @click="startAutoTracking">
							Auto Track
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
				<div class="space-y-4">
					<div
v-for="obj in objects" :key="obj.id"
						class="flex items-center justify-between p-2 rounded bg-base-100">
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 rounded-full" :style="{ backgroundColor: obj.color }"></div>
							<span>{{ obj.name }}</span>
						</div>
						<div class="flex gap-2">
							<button
class="btn btn-sm btn-ghost"
								:class="{ 'btn-active': selectedObject?.id === obj.id }" @click="selectObject(obj)">
								Track
							</button>
							<button class="btn btn-sm btn-error" @click="deleteObject(obj.id)">
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
							<button
v-for="color in predefinedColors" :key="color" type="button"
								class="w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform"
								:class="{ 'border-primary': newObject.color === color, 'border-base-content/10': newObject.color !== color }"
								:style="{ backgroundColor: color }" @click="newObject.color = color"></button>
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
const canvasRef = ref(null)
const maskCanvasRef = ref(null)
const trackingCanvasRef = ref(null)
const showObjectModal = ref(false)
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
let animationFrameId = null

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
  return activeVideoId.value && autoTrackingPoints.value.length > 0 && !isUploading.value
})

const canTest = computed(() => {
  return activeVideoId.value && autoTrackingPoints.value.length > 0 && !isUploading.value
})

onMounted(async () => {
  await videoStore.getVideo(videoId.value)
  if (video.value?.trackingData?.objects) {
    objects.value = video.value.trackingData.objects
  }
  if (videoRef.value) {
    videoRef.value.playbackRate = playbackSpeed.value
  }
  startRenderLoop()
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
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
	  console.log(error);
      trackingMode.value = 'manual'
    } finally {
      isUploading.value = false
    }
  } else {
    autoTrackingPoints.value = []
    drawObjects()
  }
})

watch(playbackSpeed, (newSpeed) => {
  if (videoRef.value) {
    videoRef.value.playbackRate = newSpeed
  }
})

const startRenderLoop = () => {
  const animate = () => {
    if (videoRef.value) {
      const video = videoRef.value
      const progress = video.currentTime / video.duration
      currentFrame.value = Math.round(progress * totalFrames.value)
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
  
  // Ensure total frames matches actual video duration
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
  }
}

const handleSeeking = () => {
  const video = videoRef.value
  video.playbackRate = playbackSpeed.value
  const progress = video.currentTime / video.duration
  currentFrame.value = Math.round(progress * totalFrames.value)
  drawObjects()
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

  objects.value.forEach(obj => {
    const position = getObjectPositionAtFrame(obj, currentFrame.value)
    if (position) {
      ctx.beginPath()
      ctx.arc(position.x, position.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = obj.color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = '14px Arial'
      ctx.fillStyle = obj.color
      ctx.fillText(obj.name, position.x + 10, position.y - 10)
    }
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
    z: prevFrame.z + (nextFrame.z - prevFrame.z) * frameProgress
  }
}

const handleMouseDown = (e) => {
  if (trackingMode.value === 'auto') {
    const canvas = trackingCanvasRef.value
    const rect = canvas.getBoundingClientRect()
    
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width)
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height)
    
    const videoWidth = videoRef.value.videoWidth
    const videoHeight = videoRef.value.videoHeight
    
    const x = Math.round((canvasX / canvas.width) * videoWidth)
    const y = Math.round((canvasY / canvas.height) * videoHeight)

    if (e.button === 0) {
      autoTrackingPoints.value.push({ x, y, include: true })
    }
    drawAutoTrackingPoints()
    return
  }

  if (!selectedObject.value) return

  const rect = trackingCanvasRef.value.getBoundingClientRect()
  const x = Math.round((e.clientX - rect.left) * (trackingCanvasRef.value.width / rect.width))
  const y = Math.round((e.clientY - rect.top) * (trackingCanvasRef.value.height / rect.height))

  if (trackingMode.value === 'manual') {
    addTrackingPoint(x, y)
  } else {
    const video = videoRef.value
    video.playbackRate = playbackSpeed.value
    video.play()
    addTrackingPoint(x, y)
  }
}

const handleMouseMove = (e) => {
  if (!selectedObject.value || trackingMode.value !== 'continuous') return

  const rect = trackingCanvasRef.value.getBoundingClientRect()
  const x = Math.round((e.clientX - rect.left) * (trackingCanvasRef.value.width / rect.width))
  const y = Math.round((e.clientY - rect.top) * (trackingCanvasRef.value.height / rect.height))

  addTrackingPoint(x, y)
}

const handleMouseUp = () => {
  if (trackingMode.value === 'continuous') {
    videoRef.value.pause()
  }
}

const handleRightClick = (e) => {
  if (trackingMode.value !== 'auto') return

  const canvas = trackingCanvasRef.value
  const rect = canvas.getBoundingClientRect()
  
  const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width)
  const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height)
  
  const videoWidth = videoRef.value.videoWidth
  const videoHeight = videoRef.value.videoHeight
  
  const x = Math.round((canvasX / canvas.width) * videoWidth)
  const y = Math.round((canvasY / canvas.height) * videoHeight)

  autoTrackingPoints.value.push({ x, y, include: false })
  drawAutoTrackingPoints()
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
    const video = videoRef.value
    const actualFrames = Math.floor(video.duration * fps.value)
    
    // Create frame indices that map to actual video time
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

    // Map tracking results to actual video frames
    const videoFrameCount = Math.floor(video.duration * fps.value)
    const resultFrameCount = Object.keys(result).length
    const scaleFactor = videoFrameCount / resultFrameCount

    selectedObject.value.tracking = Object.entries(result).map(([frame, data], index) => {
      // Scale frame numbers to match video duration
	  console.log(frame);
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
}

const handleTimelineChange = () => {
  const video = videoRef.value
  video.currentTime = currentFrame.value / fps.value
  video.playbackRate = playbackSpeed.value
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
</script>