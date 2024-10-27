// web/pages/VideosView.vue
<template>
  <div class="container mx-auto p-4 relative">
    <h1 class="text-3xl font-bold mb-6">Videos</h1>
    
    <button class="btn btn-circle btn-ghost absolute top-4 right-4" @click="showDocumentation = true">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </button>

    <div class="mb-4 flex justify-between items-center">
      <div>
        <button class="btn btn-primary" @click="showUploader = true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6 mr-2">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Video
        </button>
      </div>
      <div class="form-control">
        <input v-model="filters.search" type="text" placeholder="Search..." class="input input-bordered" @input="handleSearch">
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="video in videos" :key="video.id" class="card bg-base-200 shadow-lg">
        <div class="relative w-full pt-[56.25%]">
          <video
            :src="`${baseURL}/uploads/videos/${video.filename}`"
            class="absolute top-0 left-0 w-full h-full object-contain bg-black"
            preload="metadata"
            controls
          ></video>
        </div>
        <div class="card-body p-4">
          <h2 class="font-bold text-lg truncate">{{ video.originalName }}</h2>
          <div class="text-sm space-y-1 text-base-content/70">
            <p>Size: {{ formatFileSize(video.size) }}</p>
            <p>Added: {{ formatDate(video.created_at) }}</p>
          </div>
          <div class="card-actions justify-end mt-2">
            <RouterLink :to="`/videos/${video.id}`" class="btn btn-sm btn-info">View</RouterLink>
            <button class="btn btn-sm btn-error" @click="deleteVideo(video.id)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 flex justify-between items-center">
      <div>
        Page {{ currentPage }} / {{ totalPages }}
      </div>
      <div>
        <button
          :disabled="currentPage === 1"
          class="btn btn-sm mr-2"
          @click="changePage(-1)"
        >
          Previous
        </button>
        <button
          :disabled="currentPage === totalPages"
          class="btn btn-sm"
          @click="changePage(1)"
        >
          Next
        </button>
      </div>
    </div>

    <div v-if="showUploader" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
      <div class="bg-base-100 p-8 rounded-lg max-w-4xl w-full">
        <h2 class="text-2xl font-bold mb-6">Upload new video</h2>
        <VideoUploader
          @upload-complete="handleUploadComplete"
          @upload-error="handleUploadError"
        />
        <button class="mt-6 btn btn-ghost" @click="showUploader = false">Close</button>
      </div>
    </div>

    <div v-if="showDocumentation" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50" @click.self="showDocumentation = false">
      <div class="bg-base-100 p-8 rounded-lg max-w-4xl w-full h-5/6 overflow-auto">
        <h2 class="text-2xl font-bold mb-6">Documentation</h2>
        <vue-markdown-render :source="documentationContent" class="prose max-w-none"/>
        <button class="mt-6 btn btn-primary" @click="showDocumentation = false">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useVideosStore } from '../stores/videos'
import VueMarkdownRender from 'vue-markdown-render'
import VideoUploader from '../components/VideoUploader.vue'

const baseURL = window.baseURL
const videosStore = useVideosStore()
const videos = computed(() => videosStore.videos)
const currentPage = computed(() => videosStore.currentPage)
const totalPages = computed(() => videosStore.totalPages)

const showDocumentation = ref(false)
const showUploader = ref(false)
const documentationContent = ref('')
const filters = ref({
  search: '',
})

onMounted(async () => {
  await videosStore.getVideos()

  try {
    const response = await fetch('/documentation/pages/VideosView.generated.md')
    let content = await response.text()
    content = content.replace(/!\[Screenshot\]\((VideosView_\d+\.png)\)/g, '![Screenshot](/documentation/pages/$1)')
    documentationContent.value = content
  } catch (error) {
    console.error('Error loading documentation:', error)
  }
})

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFileSize = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

const deleteVideo = async (id) => {
  if (confirm('Are you sure you want to delete this video?')) {
    try {
      await videosStore.deleteVideo(id)
      await videosStore.getVideos()
    } catch (error) {
      alert('Error deleting video: ' + error.message)
    }
  }
}

const changePage = (delta) => {
  videosStore.setPage(currentPage.value + delta)
  videosStore.getVideos()
}

const handleSearch = () => {
  videosStore.setFilters(filters.value)
  videosStore.setPage(1)
  videosStore.getVideos()
}

const handleUploadComplete = async () => {
  showUploader.value = false
  await videosStore.getVideos()
}

const handleUploadError = (error) => {
  alert('Error uploading video: ' + error.message)
}

watch([filters], () => {
  videosStore.setPage(1)
  videosStore.getVideos()
})
</script>

<style scoped>
.prose {
  max-width: none;
}
.prose img {
  max-width: 100%;
  height: auto;
}
</style>