import { defineStore } from 'pinia'
import axios from 'axios'
import * as Sentry from '@sentry/vue'

export const useVideosStore = defineStore('videos', {
    state: () => ({
        videos: [],
        currentVideo: null,
        currentPage: 1,
        totalPages: 0,
        total: 0,
        sortColumn: 'created_at',
        sortDirection: 'DESC',
        filters: {
            search: '',
        }
    }),

    actions: {
        async getVideos() {
            try {
                const response = await axios.get(`${window.baseURL}/api/videos`, {
                    params: {
                        page: this.currentPage,
                        sortColumn: this.sortColumn,
                        sortDirection: this.sortDirection,
                        ...this.filters
                    },
                    withCredentials: true
                })
                this.videos = response.data.data
                this.totalPages = response.data.totalPages
                this.total = response.data.total
            } catch (error) {
                Sentry.captureException({ msg: 'Error fetching videos', error })
                throw error
            }
        },

        async getVideo(id) {
            try {
                const response = await axios.get(`${window.baseURL}/api/videos/${id}`, {
                    withCredentials: true
                })
                this.currentVideo = response.data
                return this.currentVideo
            } catch (error) {
                Sentry.captureException({ msg: 'Error fetching video', error })
                throw error
            }
        },

        async uploadVideo(formData, config = {}) {
            try {
                const response = await axios.post(`${window.baseURL}/api/videos`, formData, {
                    ...config,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    withCredentials: true
                })
                return response.data
            } catch (error) {
                Sentry.captureException({ msg: 'Error uploading video', error })
                throw error
            }
        },

        async deleteVideo(id) {
            try {
                await axios.delete(`${window.baseURL}/api/videos/${id}`, {
                    withCredentials: true
                })
                this.currentVideo = null
            } catch (error) {
                Sentry.captureException({ msg: 'Error deleting video', error })
                throw error
            }
        },

        setPage(page) {
            this.currentPage = page
        },

        setSorting(column, direction) {
            this.sortColumn = column
            this.sortDirection = direction
        },

        setFilters(filters) {
            this.filters = filters
        },

        resetFilters() {
            this.filters = {
                search: '',
            }
        }
    }
})