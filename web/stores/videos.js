import { defineStore } from 'pinia'
import axios from 'axios'

export const useVideosStore = defineStore('videos', {
  state: () => ({
    videos: [],
    currentVideo: null,
    currentPage: 1,
    totalPages: 1,
    totalVideos: 0,
    fps: 30,
    filters: {
      search: '',
      sortColumn: 'created_at',
      sortDirection: 'DESC'
    }
  }),

  actions: {
    async getVideos() {
      try {
        const response = await axios.get(`${window.baseURL}/api/videos`, {
          params: {
            page: this.currentPage,
            limit: 10,
            search: this.filters.search,
            sortColumn: this.filters.sortColumn,
            sortDirection: this.filters.sortDirection
          }
        })

        this.videos = response.data.data
        this.totalPages = response.data.totalPages
        this.totalVideos = response.data.total
      } catch (error) {
        console.error('Error fetching videos:', error)
        throw error
      }
    },

    async getVideo(id) {
      try {
        const response = await axios.get(`${window.baseURL}/api/videos/${id}`)
        this.currentVideo = response.data
        return response.data
      } catch (error) {
        console.error('Error fetching video:', error)
        throw error
      }
    },

    async uploadVideo(formData, config = {}) {
      try {
        const response = await axios.post(`${window.baseURL}/api/videos`, formData, {
          ...config,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.fps) {
          this.fps = response.data.fps
        }
        
        return response.data
      } catch (error) {
        console.error('Error uploading video:', error)
        throw error
      }
    },

    async deleteVideo(id) {
      try {
        await axios.delete(`${window.baseURL}/api/videos/${id}`)
        this.videos = this.videos.filter(video => video.id !== id)
      } catch (error) {
        console.error('Error deleting video:', error)
        throw error
      }
    },

    async updateVideoTracking(id, trackingData) {
      try {
        const response = await axios.put(`${window.baseURL}/api/videos/${id}`, {
          trackingData
        })
        this.currentVideo = response.data
        return response.data
      } catch (error) {
        console.error('Error updating video tracking:', error)
        throw error
      }
    },

    setPage(page) {
      this.currentPage = page
    },

    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    }
  }
})