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

<script setup lang="ts">
import { useSettingsView } from './SettingsView';

const {
  isLoaded,
  selectedTheme,
  themes,
  validationError,
  saveSettings,
  changeTheme,
} = useSettingsView();
</script>