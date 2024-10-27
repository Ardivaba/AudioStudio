<template>
  <div class="container mx-auto p-4 relative">
    <h1 class="text-3xl font-bold mb-6">Video Details</h1>

    <div class="bg-base-200 p-6 rounded-lg shadow-lg">
      <h2 class="text-2xl font-semibold mb-4">Video #{{ video?.id }}</h2>

      <div class="grid grid-cols-1 gap-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="aspect-w-16 aspect-h-9 bg-base-300 rounded-lg overflow-hidden">
            <video
              v-if="video"
              :src="`${baseURL}/uploads/videos/${video.filename}`"
              controls
              class="w-full h-full object-contain"
            ></video>
          </div>

          <div v-if="video?.depthFilename || isGenerating || video?.depthGenerationFailed" class="aspect-w-16 aspect-h-9 bg-base-300 rounded-lg overflow-hidden">
            <div v-if="isGenerating" class="flex items-center justify-center h-full">
              <div class="text-center">
                <div class="loading loading-spinner loading-lg mb-4"></div>
                <p>Generating depth map...</p>
              </div>
            </div>
            <div v-else-if="video?.depthGenerationFailed" class="flex items-center justify-center h-full">
              <div class="text-center text-error">
                <p class="mb-2">Depth generation failed</p>
                <button class="btn btn-error" @click="generateDepth">Try Again</button>
              </div>
            </div>
            <video
              v-else-if="video?.depthFilename"
              :src="`${baseURL}/uploads/videos/${video.depthFilename}`"
              controls
              class="w-full h-full object-contain"
            ></video>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-medium mb-2">General Information</h3>
            <p><strong>Filename:</strong> {{ video?.originalName }}</p>
            <p><strong>Size:</strong> {{ formatFileSize(video?.size) }}</p>
            <p><strong>Type:</strong> {{ video?.mimeType }}</p>
          </div>

          <div>
            <h3 class="text-lg font-medium mb-2">Description</h3>
            <p>{{ video?.description || 'No description available' }}</p>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-medium mb-2">Timestamps</h3>
          <p><strong>Created:</strong> {{ formatDate(video?.created_at) }}</p>
          <p><strong>Last Modified:</strong> {{ formatDate(video?.updated_at) }}</p>
        </div>

        <div class="flex gap-2">
          <button 
            v-if="!video?.depthFilename && !isGenerating && !video?.depthGenerationFailed"
            class="btn btn-primary"
            @click="generateDepth"
          >
            Generate Depth Video
          </button>
          <button 
            v-if="isGenerating"
            class="btn btn-primary" 
            disabled
          >
            Generating...
          </button>
          <button class="btn btn-error" @click="deleteVideo">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useVideosStore } from '../stores/videos'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const baseURL = window.baseURL
const videosStore = useVideosStore()
const route = useRoute()
const router = useRouter()
const isGenerating = ref(false)
const generationStartTime = ref(null)

const video = computed(() => videosStore.currentVideo)

onMounted(async () => {
  if (route.params.id) {
    await videosStore.getVideo(route.params.id)
    if (video.value?.isGeneratingDepth) {
      isGenerating.value = true
      generationStartTime.value = Date.now()
      pollGenerationStatus()
    }
  }
})

const pollGenerationStatus = async () => {
  if (!isGenerating.value) return
  
  if (Date.now() - generationStartTime.value > 600000) {
    isGenerating.value = false
    return
  }

  await videosStore.getVideo(route.params.id)
  
  if (video.value?.isGeneratingDepth) {
    setTimeout(pollGenerationStatus, 5000)
  } else {
    isGenerating.value = false
  }
}

const generateDepth = async () => {
  try {
    isGenerating.value = true
    generationStartTime.value = Date.now()
    await axios.post(`${baseURL}/api/videos/${video.value.id}/generate-depth`)
    pollGenerationStatus()
  } catch (error) {
    isGenerating.value = false
    alert('Error generating depth video: ' + error.response?.data?.error || error.message)
  }
}

const formatDate = (dateString) => {
  return dateString ? new Date(dateString).toLocaleString('en-US') : 'N/A'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

const deleteVideo = async () => {
  if (confirm('Are you sure you want to delete this video?')) {
    await videosStore.deleteVideo(video.value.id)
    router.push('/videos')
  }
}
</script>