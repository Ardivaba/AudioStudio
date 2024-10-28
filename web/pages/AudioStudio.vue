<template>
	<div class="container mx-auto p-4 relative">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-3xl font-bold">Audio Studio</h1>
			<button class="btn" @click="$router.push(`/videos/${videoId}`)">Back to Video</button>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
			<div class="lg:col-span-3 bg-base-200 p-4 rounded-lg">
				<div ref="canvasContainer" class="w-full h-[80vh] bg-black rounded-lg overflow-hidden relative">
					<canvas ref="canvas" />
					<div v-if="!isControlsActive"
						class="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
						Click to activate controls<br>
						WASD - Move<br>
						Q/E - Up/Down<br>
						Space/Ctrl - Up/Down (Alt.)<br>
						Mouse - Look<br>
						ESC - Release controls
					</div>
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
					</div>

					<div class="w-full">
						<input :value="currentFrame" type="range" min="0" :max="totalFrames" class="range" step="1"
							@input="handleTimelineChange">
						<div class="flex justify-between text-xs mt-1">
							<span>0:00</span>
							<span>{{ formatTime(duration) }}</span>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-base-200 p-4 rounded-lg">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-xl font-bold">Objects</h2>
				</div>
				<div class="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto">
					<div v-for="obj in trackedObjects" :key="obj.id"
						class="flex items-center justify-between p-2 rounded bg-base-100">
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 rounded-full" :style="{ backgroundColor: obj.color }"></div>
							<span>{{ obj.name }}</span>
						</div>
						<div class="flex gap-2">
							<button class="btn btn-sm btn-ghost"
								:class="{ 'btn-active': selectedObject?.id === obj.id }" @click="selectObject(obj)">
								Select
							</button>
							<button class="btn btn-sm btn-error" @click="deleteObject(obj.id)">
								Delete
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, getCurrentInstance } from 'vue'
import { useRoute } from 'vue-router'
import { useVideosStore } from '../stores/videos'
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'

const route = useRoute()
const videoStore = useVideosStore()
const instance = getCurrentInstance()
const { proxy } = instance

const videoId = computed(() => route.params.id)
const video = computed(() => videoStore.currentVideo)
const fps = computed(() => videoStore.fps)
const trackedObjects = computed(() => video.value?.compiledTracking?.objects || [])

const canvasContainer = ref(null)
const canvas = ref(null)
const camera = ref(null)
const renderer = ref(null)
const controls = ref(null)
const objects = ref({})
const selectedObject = ref(null)
const isPlaying = ref(false)
const videoEnded = ref(false)
const playbackSpeed = ref(0.5)
const currentFrame = ref(0)
const totalFrames = ref(300)
const duration = ref(10)
const isControlsActive = ref(false)
let animationFrameId = null
let lastFrameTime = 0

proxy.$scene = new THREE.Scene()
const scene = proxy.$scene

const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false
}

const velocity = new THREE.Vector3()
const direction = new THREE.Vector3()
const moveSpeed = 5.0

const initThreeJS = () => {
  scene.background = new THREE.Color(0x000000)

  const container = canvasContainer.value
  const aspect = container.clientWidth / container.clientHeight
  camera.value = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
  camera.value.position.set(0, 2, 5)

  renderer.value = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  })
  renderer.value.setSize(container.clientWidth, container.clientHeight)
  renderer.value.setPixelRatio(window.devicePixelRatio)
  renderer.value.outputEncoding = THREE.sRGBEncoding

  controls.value = new PointerLockControls(camera.value, canvasContainer.value)

  controls.value.addEventListener('lock', () => {
    isControlsActive.value = true
  })

  controls.value.addEventListener('unlock', () => {
    isControlsActive.value = false
  })

  const gridGeometry = new THREE.PlaneGeometry(100, 100, 100, 100)
  const gridMaterial = new THREE.MeshBasicMaterial({
    wireframe: true,
    color: 0x444444,
    transparent: true,
    opacity: 0.2
  })
  const grid = new THREE.Mesh(gridGeometry, gridMaterial)
  grid.rotation.x = -Math.PI / 2
  scene.add(grid)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  canvasContainer.value.addEventListener('click', () => {
    if (!isControlsActive.value) {
      controls.value.lock()
    }
  })
}

const createObjects = () => {
  if (!video.value?.compiledTracking?.objects) return

  video.value.compiledTracking.objects.forEach(obj => {
    const geometry = new THREE.SphereGeometry(0.1, 16, 16)
    const material = new THREE.MeshPhongMaterial({
      color: obj.color,
      emissive: obj.color,
      emissiveIntensity: 0.2,
      shininess: 100
    })
    
    const sphere = new THREE.Mesh(geometry, material)
    sphere.matrixAutoUpdate = true
    
    const light = new THREE.PointLight(obj.color, 1, 1)
    sphere.add(light)

    // Create text label
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 256
    canvas.height = 128
    ctx.fillStyle = '#ffffff'
    ctx.font = '60px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(obj.name, canvas.width / 2, canvas.height / 2)
    
    const texture = new THREE.CanvasTexture(canvas)
    const labelMaterial = new THREE.SpriteMaterial({ map: texture })
    const label = new THREE.Sprite(labelMaterial)
    label.scale.set(2, 1, 1)
    label.position.y = 0.5
    sphere.add(label)
    
    scene.add(sphere)
    objects.value[obj.id] = { sphere, light, label }
  })
}

const updateObjects = (frame) => {
  if (!video.value?.compiledTracking?.objects) return

  video.value.compiledTracking.objects.forEach(obj => {
    const object = objects.value[obj.id]
    if (!object) return

    const position = obj.tracking.find(t => t.frameNumber === frame)
    if (!position) return

    const { sphere } = object
    sphere.position.set(position.worldX, position.worldY, position.worldZ)

    // Keep the label facing the camera
    if (object.label) {
      object.label.quaternion.copy(camera.value.quaternion)
    }
  })

  renderer.value.render(scene, camera.value)
}

const handleKeyDown = (event) => {
  if (!isControlsActive.value) return
  
  switch (event.code) {
    case 'KeyW':
      moveState.forward = true
      break
    case 'KeyS':
      moveState.backward = true
      break
    case 'KeyA':
      moveState.left = true
      break
    case 'KeyD':
      moveState.right = true
      break
    case 'KeyQ':
    case 'Space':
      moveState.up = true
      break
    case 'KeyE':
    case 'ControlLeft':
      moveState.down = true
      break
  }
}

const handleKeyUp = (event) => {
  switch (event.code) {
    case 'KeyW':
      moveState.forward = false
      break
    case 'KeyS':
      moveState.backward = false
      break
    case 'KeyA':
      moveState.left = false
      break
    case 'KeyD':
      moveState.right = false
      break
    case 'KeyQ':
    case 'Space':
      moveState.up = false
      break
    case 'KeyE':
    case 'ControlLeft':
      moveState.down = false
      break
  }
}

const moveCamera = (delta) => {
  velocity.x = 0
  velocity.y = 0
  velocity.z = 0

  direction.z = Number(moveState.forward) - Number(moveState.backward)
  direction.x = Number(moveState.right) - Number(moveState.left)
  direction.normalize()

  if (moveState.forward || moveState.backward) {
    velocity.z -= direction.z * moveSpeed * delta
  }
  if (moveState.left || moveState.right) {
    velocity.x -= direction.x * moveSpeed * delta
  }
  if (moveState.up) {
    velocity.y += moveSpeed * delta
  }
  if (moveState.down) {
    velocity.y -= moveSpeed * delta
  }

  controls.value.moveRight(-velocity.x)
  controls.value.moveForward(-velocity.z)
  
  const currentPosition = camera.value.position.clone()
  currentPosition.y += velocity.y
  camera.value.position.copy(currentPosition)
}

const focusOnObject = (obj) => {
  if (!obj || !objects.value[obj.id]) return
  
  const { sphere } = objects.value[obj.id]
  const targetPos = sphere.position.clone()
  
  controls.value.unlock()
  isControlsActive.value = false

  const distance = 1
  camera.value.position.set(
    targetPos.x,
    targetPos.y,
    targetPos.z + distance
  )
  camera.value.lookAt(targetPos)
}

const selectObject = (obj) => {
  if (selectedObject.value?.id === obj.id) {
    selectedObject.value = null
  } else {
    selectedObject.value = obj
    focusOnObject(obj)
  }
}

const deleteObject = (id) => {
  if (!objects.value[id]) return
  
  if (confirm('Are you sure you want to delete this object?')) {
    const { sphere, light, label } = objects.value[id]
    sphere.remove(light)
    sphere.remove(label)
    scene.remove(sphere)
    delete objects.value[id]
    
    video.value.compiledTracking.objects = video.value.compiledTracking.objects.filter(obj => obj.id !== id)
    
    if (selectedObject.value?.id === id) {
      selectedObject.value = null
    }
  }
}

const animate = (time) => {
  if (!camera.value || !renderer.value) return

  const delta = (time - lastFrameTime) / 1000
  lastFrameTime = time

  if (isControlsActive.value) {
    moveCamera(delta)
  }

  if (isPlaying.value) {
    currentFrame.value += Math.floor(delta * fps.value * playbackSpeed.value)
    
    if (currentFrame.value >= totalFrames.value) {
      currentFrame.value = 0
      isPlaying.value = false
      videoEnded.value = true
    }
  }

  updateObjects(currentFrame.value)
  animationFrameId = requestAnimationFrame(animate)
}

const handleResize = () => {
  if (!canvasContainer.value || !camera.value || !renderer.value) return

  const container = canvasContainer.value
  const aspect = container.clientWidth / container.clientHeight

  camera.value.aspect = aspect
  camera.value.updateProjectionMatrix()

  renderer.value.setSize(container.clientWidth, container.clientHeight)
}

const togglePlayPause = () => {
  if (videoEnded.value) {
    currentFrame.value = 0
    videoEnded.value = false
  }
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    lastFrameTime = performance.now()
  }
}

const handleTimelineChange = (event) => {
  currentFrame.value = parseInt(event.target.value)
  if (currentFrame.value >= totalFrames.value) {
    currentFrame.value = totalFrames.value
    isPlaying.value = false
    videoEnded.value = true
  }
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

onMounted(async () => {
  await videoStore.getVideo(videoId.value)
  if (!video.value?.compiledTracking) return

  totalFrames.value = Math.max(...video.value.compiledTracking.objects.flatMap(obj => 
    obj.tracking.map(t => t.frameNumber)
  ))
  duration.value = totalFrames.value / fps.value

  initThreeJS()
  createObjects()
  animate(0)

  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  if (renderer.value) {
    renderer.value.dispose()
  }

  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

watch(currentFrame, () => {
  updateObjects(currentFrame.value)
})

watch(playbackSpeed, () => {
  if (isPlaying.value) {
    lastFrameTime = performance.now()
  }
})
</script>

<style scoped>
	canvas {
		width: 100% !important;
		height: 100% !important;
	}
</style>