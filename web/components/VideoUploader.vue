<template>
  <div 
    class="border-4 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
    :class="{ 'border-primary': isDragging, 'bg-base-200': isDragging }"
    @dragenter.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="video/mp4,video/webm,video/ogg"
      @change="handleFileSelect"
    />
    
    <div v-if="!isUploading">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-16 h-16 mx-auto mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p class="text-lg mb-2">Drag and drop your video here</p>
      <p class="text-sm text-base-content/70 mb-4">or</p>
      <button class="btn btn-primary" @click="$refs.fileInput.click()">
        Select Video
      </button>
      <p class="text-sm text-base-content/70 mt-2">
        Supported formats: MP4, WebM, OGG (max 100MB)
      </p>
    </div>

    <div v-else class="w-full">
      <p class="mb-2">Uploading {{ currentFile.name }}</p>
      <progress 
        class="progress progress-primary w-full" 
        :value="uploadProgress" 
        max="100"
      ></progress>
      <p class="text-sm text-base-content/70 mt-2">
        {{ Math.round(uploadProgress) }}% complete
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useVideosStore } from '../stores/videos';

const videosStore = useVideosStore();
const isDragging = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const currentFile = ref(null);

const emit = defineEmits(['upload-complete', 'upload-error']);

const validateFile = (file) => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only MP4, WebM, and OGG videos are allowed.');
  }

  if (file.size > maxSize) {
    throw new Error('File is too large. Maximum size is 100MB.');
  }
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadFile(file);
  }
};

const handleDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer.files[0];
  if (file) {
    uploadFile(file);
  }
};

const uploadFile = async (file) => {
  try {
    validateFile(file);
    
    currentFile.value = file;
    isUploading.value = true;
    uploadProgress.value = 0;

    const formData = new FormData();
    formData.append('video', file);

    const video = await videosStore.uploadVideo(formData, {
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = (progressEvent.loaded / progressEvent.total) * 100;
      }
    });

    emit('upload-complete', video);
  } catch (error) {
    emit('upload-error', error);
  } finally {
    isUploading.value = false;
    currentFile.value = null;
    uploadProgress.value = 0;
  }
};
</script>