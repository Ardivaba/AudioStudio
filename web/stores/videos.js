import { defineStore } from 'pinia'
import axios from 'axios'

export const useVideosStore = defineStore('videos', {
    state: () => ({
        videos: [],
        currentVideo: null,
        currentPage: 1,
        totalPages: 1,
        filters: {
            search: '',
        },
        fps: 30
    }),

    actions: {
        async getVideos() {
            try {
                const response = await axios.get(`${window.baseURL}/api/videos`, {
                    params: {
                        page: this.currentPage,
                        ...this.filters
                    }
                })
                this.videos = response.data.data
                this.totalPages = response.data.totalPages
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
                const response = await axios.post(
                    `${window.baseURL}/api/videos`,
                    formData,
                    {
                        ...config,
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                )
                return response.data
            } catch (error) {
                console.error('Error uploading video:', error)
                throw error
            }
        },

        async deleteVideo(id) {
            try {
                await axios.delete(`${window.baseURL}/api/videos/${id}`)
                this.videos = this.videos.filter(v => v.id !== id)
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
                if (this.currentVideo?.id === id) {
                    this.currentVideo = response.data
                }
                return response.data
            } catch (error) {
                console.error('Error updating video tracking:', error)
                throw error
            }
        },

        async updateVideoCalibration(id, calibrationPoints) {
            try {
                const response = await axios.put(`${window.baseURL}/api/videos/${id}`, {
                    calibrationPoints
                })
                if (this.currentVideo?.id === id) {
                    this.currentVideo = response.data
                }
                return response.data
            } catch (error) {
                console.error('Error updating video calibration:', error)
                throw error
            }
        },

        async updateVideoCompiled(id, compiledTracking) {
            try {
                const response = await axios.put(`${window.baseURL}/api/videos/${id}`, {
                    compiledTracking
                })
                if (this.currentVideo?.id === id) {
                    this.currentVideo = response.data
                }
                return response.data
            } catch (error) {
                console.error('Error updating compiled tracking:', error)
                throw error
            }
        },

        setPage(page) {
            this.currentPage = page
        },

        setFilters(filters) {
            this.filters = filters
        }
    }
})