import { createRouter, createWebHistory } from 'vue-router'

import HomeView from './pages/HomeView.vue'
import SettingsView from "./pages/SettingsView.vue"
import LoginView from "./pages/LoginView.vue"
import VideosView from "./pages/VideosView.vue"
import VideoView from "./pages/VideoView.vue"

const routes = [
    {path: '/', name: 'home', component: HomeView},
    {path: '/settings', name: 'settings', component: SettingsView},
    {path: '/login', name: 'login', component: LoginView},
    {path: '/videos', name: 'videos', component: VideosView},
    {path: '/videos/:id', name: 'video', component: VideoView},
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router