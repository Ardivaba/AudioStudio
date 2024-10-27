import { defineStore } from 'pinia'
import axios from "axios";
import * as Sentry from "@sentry/vue";

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: {
            max_parking_time: 0,
            parking_lot_active: true,
            total_spaces: 0,
            taken_spaces: 0
        },
    }),
    actions: {
        async getSettings() {
            try {
                const response = await axios.get(`${window.baseURL}/api/settings`);
                this.settings = response.data;
            } catch (error) {
                Sentry.captureException({msg: 'Error fetching settings', error});
            }
        },
        async updateSettings() {
            try {
                const response = await axios.put(`${window.baseURL}/api/settings`, this.settings);
                this.settings = response.data;
                return this.settings;
            } catch (error) {
                Sentry.captureException({msg: 'Error updating settings', error});
                throw error;
            }
        },
    },
});