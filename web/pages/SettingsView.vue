<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6">Settings</h1>

    <form v-if="isLoaded" class="bg-base-200 p-6 rounded-lg shadow-lg max-w-2xl mx-auto" @submit.prevent="saveSettings">
      <div class="space-y-6">
        <div class="form-control">
          <label class="label" for="themeSelect">
            <span class="label-text">Color Scheme</span>
          </label>
          <select
            id="themeSelect"
            v-model="selectedTheme"
            class="select select-bordered w-full"
            @change="changeTheme"
          >
            <option v-for="theme in themes" :key="theme.name" :value="theme.name">
              {{ theme.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="mt-8 flex justify-end">
        <button type="submit" class="btn btn-primary" :disabled="!!validationError">Save changes</button>
      </div>
    </form>
    <div v-else class="text-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { useThemeStore } from '../stores/theme';

const settingsStore = useSettingsStore();
const themeStore = useThemeStore();

// const settings = computed(() => settingsStore.settings);
const isLoaded = ref(false);
const selectedTheme = ref('');

const themes = [
  { name: 'light', label: 'Hele' },
  { name: 'dark', label: 'Tume' },
  { name: 'cupcake', label: 'Cupcake' },
  { name: 'bumblebee', label: 'Bumblebee' },
  { name: 'emerald', label: 'Emerald' },
  { name: 'corporate', label: 'Corporate' },
  { name: 'synthwave', label: 'Synthwave' },
  { name: 'retro', label: 'Retro' },
  { name: 'cyberpunk', label: 'Cyberpunk' },
  { name: 'valentine', label: 'Valentine' },
];

const validationError = computed(() => {
  return null;
});

onMounted(async () => {
  await settingsStore.getSettings();
  selectedTheme.value = themeStore.currentTheme;
  isLoaded.value = true;
});

const saveSettings = async () => {
  if (validationError.value) {
    return;
  }
  try {
    await settingsStore.updateSettings();
    alert('Seaded edukalt salvestatud!');
  } catch (error) {
    alert('Viga seadete salvestamisel: ' + error.message);
  }
};

const changeTheme = () => {
  themeStore.setTheme(selectedTheme.value);
};
</script>