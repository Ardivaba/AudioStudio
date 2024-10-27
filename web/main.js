import { createApp } from 'vue'
import VaoApp from './VaoApp.vue'
import { createPinia } from 'pinia'
import router from "./router.js";
import axios from "axios";
import * as Sentry from '@sentry/vue';
import { useThemeStore } from './stores/theme.js';

const pinia = createPinia()
const app = createApp(VaoApp)

if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        app,
        dsn: import.meta.env.VITE_SENTRY_DSN,
        integrations: [
            Sentry.browserTracingIntegration({ router }),
            Sentry.replayIntegration()
        ],
        sampleRate: 0.1,
        tracesSampleRate: 0.01,
        trackComponents: true,
        replaysSessionSampleRate: 0.01,
        replaysOnErrorSampleRate: 1.0,
    });
}


axios.interceptors.response.use(
    response => response,
    error => {
        /*
        if (error.response && error.response.status === 401) {
            router.push('/login')
                .then(() => {
                })
                .catch(err => {
                    Sentry.captureException(err);
                });
        }
        */
        return Promise.reject(error);
    }
);
axios.defaults.withCredentials = true;

window.baseURL = "http://localhost:3000";

app.use(pinia).use(router).mount('#app');

const themeStore = useThemeStore();
themeStore.setTheme(themeStore.currentTheme);
