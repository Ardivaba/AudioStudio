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
            ref="videoRef"
            :src="`${baseURL}/uploads/videos/${video?.filename}`"
            class="w-full rounded-lg"
            @loadedmetadata="handleVideoLoaded"
            @timeupdate="handleTimeUpdate"
            @seeking="handleSeeking"
          ></video>
          <canvas
            ref="canvasRef"
            class="absolute top-0 left-0 w-full h-full pointer-events-none"
          ></canvas>
          <canvas
            ref="trackingCanvasRef"
            class="absolute top-0 left-0 w-full h-full"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
          ></canvas>
        </div>

        <div class="mt-4 space-y-4">
          <div class="flex items-center gap-4">
            <button class="btn" @click="togglePlayPause">
              {{ isPlaying ? 'Pause' : 'Play' }}
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
              </select>
            </div>
          </div>

          <div class="w-full">
            <input
              v-model="currentFrame"
              type="range"
              min="0"
              :max="totalFrames"
              class="range"
              step="1"
              @input="handleTimelineChange"
            >
            <div class="flex justify-between text-xs mt-1">
              <span>0:00</span>
              <span>{{ formatTime(videoDuration) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-base-200 p-4 rounded-lg">
        <h2 class="text-xl font-bold mb-4">Objects</h2>
        <div class="space-y-4">
          <div
            v-for="obj in objects"
            :key="obj.id"
            class="flex items-center justify-between p-2 rounded bg-base-100"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-4 h-4 rounded-full"
                :style="{ backgroundColor: obj.color }"
              ></div>
              <span>{{ obj.name }}</span>
            </div>
            <div class="flex gap-2">
              <button
                class="btn btn-sm btn-ghost"
                :class="{ 'btn-active': selectedObject?.id === obj.id }"
                @click="selectObject(obj)"
              >
                Track
              </button>
              <button
                class="btn btn-sm btn-error"
                @click="deleteObject(obj.id)"
              >
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
            <input
              v-model="newObject.name"
              type="text"
              class="input input-bordered"
              required
            >
          </div>
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Object Type</span>
            </label>
            <select v-model="newObject.type" class="select select-bordered" required>
              <option value="skeleton">Skeleton</option>
              <option value="flashlight">Flashlight</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Color</span>
            </label>
            <input
              v-model="newObject.color"
              type="color"
              class="input input-bordered h-12"
              required
            >
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
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useVideosStore } from '../stores/videos'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'

const baseURL = window.baseURL
const route = useRoute()
const videoStore = useVideosStore()

const videoId = computed(() => route.params.id)
const video = computed(() => videoStore.currentVideo)

const videoRef = ref(null)
const canvasRef = ref(null)
const trackingCanvasRef = ref(null)
const showObjectModal = ref(false)
const objects = ref([])
const selectedObject = ref(null)
const isPlaying = ref(false)
const playbackSpeed = ref(0.5)
const trackingMode = ref('manual')
const currentFrame = ref(0)
const totalFrames = ref(0)
const videoDuration = ref(0)
const isTracking = ref(false)
const lastMousePosition = ref({ x: 0, y: 0 })

const newObject = ref({
  name: '',
  type: 'custom',
  color: '#ff0000'
})

onMounted(async () => {
  await videoStore.getVideo(videoId.value)
  if (video.value?.trackingData?.objects) {
    objects.value = video.value.trackingData.objects
  }
})

const handleVideoLoaded = () => {
  const video = videoRef.value
  video.playbackRate = playbackSpeed.value
  videoDuration.value = video.duration
  totalFrames.value = Math.floor(video.duration * 30)

  const canvas = canvasRef.value
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const trackingCanvas = trackingCanvasRef.value
  trackingCanvas.width = video.videoWidth
  trackingCanvas.height = video.videoHeight
}

const handleTimeUpdate = () => {
  const video = videoRef.value
  currentFrame.value = Math.floor(video.currentTime * 30)
  drawObjects()
}

const handleSeeking = () => {
  drawObjects()
}

const drawObjects = () => {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

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
  if (!selectedObject.value) return

  const rect = trackingCanvasRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left) * (trackingCanvasRef.value.width / rect.width)
  const y = (e.clientY - rect.top) * (trackingCanvasRef.value.height / rect.height)

  lastMousePosition.value = { x, y }
  isTracking.value = true

  if (trackingMode.value === 'manual') {
    addTrackingPoint(x, y)
  } else {
    videoRef.value.play()
  }
}

const handleMouseMove = (e) => {
  if (!isTracking.value || !selectedObject.value) return

  const rect = trackingCanvasRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left) * (trackingCanvasRef.value.width / rect.width)
  const y = (e.clientY - rect.top) * (trackingCanvasRef.value.height / rect.height)

  lastMousePosition.value = { x, y }

  if (trackingMode.value === 'continuous') {
    addTrackingPoint(x, y)
  }
}

const handleMouseUp = () => {
  if (trackingMode.value === 'continuous') {
    videoRef.value.pause()
  }
  isTracking.value = false
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

const saveTrackingData = async () => {
  try {
    await axios.put(`${baseURL}/api/videos/${videoId.value}`, {
      trackingData: { objects: objects.value }
    })
  } catch (error) {
    console.error('Error saving tracking data:', error)
  }
}

const togglePlayPause = () => {
  const video = videoRef.value
  if (video.paused) {
    video.play()
    isPlaying.value = true
  } else {
    video.pause()
    isPlaying.value = false
  }
}

const handleTimelineChange = () => {
  const video = videoRef.value
  video.currentTime = currentFrame.value / 30
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
    type: newObject.value.type,
    color: newObject.value.color,
    tracking: []
  }
  objects.value.push(obj)
  saveTrackingData()
  showObjectModal.value = false
  newObject.value = { name: '', type: 'custom', color: '#ff0000' }
}

const selectObject = (obj) => {
  selectedObject.value = selectedObject.value?.id === obj.id ? null : obj
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

watch(playbackSpeed, (newSpeed) => {
  if (videoRef.value) {
    videoRef.value.playbackRate = newSpeed
  }
})
</script>